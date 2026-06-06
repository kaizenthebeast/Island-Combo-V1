import 'server-only'

/**
 * Unified checkout core — the shared brain behind BOTH the product order flow
 * (/api/checkout) and the cash-voucher flow (/api/paypal/orders*).
 *
 * Two responsibilities, deliberately split:
 *   • resolveCheckoutAmount() — computes the SERVER-TRUSTED amount the buyer is
 *     charged. Never trusts client prices/totals: product prices are re-read from
 *     cart_view, the promo is re-validated, shipping is re-quoted server-side.
 *   • fulfillCheckout() — creates the order (create_order RPC) or the voucher
 *     (createCashVoucher), recording the payment and keying idempotency on the
 *     PayPal capture id.
 */

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { getCart } from '@/lib/cart/cart'
import { getUserAddress } from '@/lib/account/address'
import { applyPromoCode } from '@/lib/promotional-codes/apply-promo-code'
import { calculateTotals } from '@/lib/checkout/calculate-totals'
import { pointsToCash } from '@/lib/cart/loyalty-config'
import { chargeTotal, voucherValueFromTotal } from '@/lib/cash-vouchers/pricing'
import { createCashVoucher } from '@/lib/cash-vouchers/cash-voucher'
import { getZoneFromAddress } from '@/lib/shipping/zone'
import { quoteShipping, selectShippingFee } from '@/lib/shipping/quote'
import type { CartItem } from '@/lib/types/cart'
import type {
  CheckoutIntent,
  ProductCheckoutIntent,
  VoucherCheckoutIntent,
  CheckoutAmount,
  FulfillmentPayment,
  ResolvedOrderItem,
  Order,
} from '@/lib/types/order'

const round2 = (n: number) => Math.round(n * 100) / 100

// The trusted unit price for a cart row: the tier-resolved price from cart_view,
// falling back the same way the cart UI does.
const unitPriceOf = (item: CartItem) => item.applied_price || item.final_price || item.price

// ── Amount resolution ────────────────────────────────────────────────────────

export async function resolveCheckoutAmount(intent: CheckoutIntent): Promise<CheckoutAmount> {
  if (intent.kind === 'cash_voucher') return resolveVoucherAmount(intent)
  return resolveProductAmount(intent)
}

function resolveVoucherAmount(intent: VoucherCheckoutIntent): CheckoutAmount {
  if (!Number.isFinite(intent.amount) || intent.amount <= 0) {
    throw new Error('A valid voucher amount is required.')
  }
  return {
    total: chargeTotal(intent.amount),
    subtotal: round2(intent.amount),
    shippingFee: 0,
    discountAmount: 0,
    promoCode: null,
    pointsRedeemed: 0,
    shippingMethod: null,
  }
}

async function resolveProductAmount(intent: ProductCheckoutIntent): Promise<CheckoutAmount> {
  const user = await requireUser()
  if (!user) throw new Error('Unauthorized')

  const cart = await getCart(user.id)
  const selected = cart.filter((item) => intent.selectedVariantIds.includes(item.variant_id))

  if (selected.length === 0) {
    throw new Error('No items selected for checkout.')
  }

  const items: ResolvedOrderItem[] = selected.map((item) => ({
    variant_id: item.variant_id,
    quantity: item.quantity,
    unit_price: round2(unitPriceOf(item)),
  }))

  const subtotal = round2(items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0))
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)

  // Promo can't combine with wholesale pricing (mirrors BillingSummary).
  const hasWholesale = selected.some((item) => item.applied_tier_label === 'wholesale')
  let appliedPromo: { code: string; value: number } | null = null
  if (intent.promoCode && !hasWholesale) {
    const result = await applyPromoCode(intent.promoCode, totalQty)
    if (result.success && result.promoCode) appliedPromo = result.promoCode
  }

  // Shipping is re-quoted server-side from the (owned) address. Pickup ships free.
  let shippingFee = 0
  let shippingMethod: 'GCR' | 'QPI' | null = null
  if (intent.fulfillment === 'deliver') {
    const addresses = await getUserAddress(user.id)
    const address = addresses.find((a) => a.id === intent.shippingAddressId)
    if (!address) throw new Error('Select a delivery address to continue.')

    const zone = getZoneFromAddress(address)
    if (!zone) throw new Error('We can’t ship to this address.')

    const quote = quoteShipping(
      zone,
      // No per-product weight yet — assume 1kg per piece, same as the estimate.
      items.map((i) => ({ weightKg: 1, qty: i.quantity })),
    )
    const selectedShipping = selectShippingFee(quote)
    if (!selectedShipping) throw new Error('No shipping option is available for this address.')

    shippingFee = selectedShipping.fee
    shippingMethod = selectedShipping.method
  }

  // Loyalty redemption: consume the points the cart reserved (server truth, from
  // cart_meta — never the client), as cash, capped so it can't exceed the
  // post-promo subtotal. create_order debits exactly `pointsRedeemed` atomically.
  const supabase = await createClient()
  const { data: meta } = await supabase
    .from('cart_meta')
    .select('points_redeemed')
    .eq('user_id', user.id)
    .maybeSingle()
  const heldPoints = meta?.points_redeemed ?? 0
  const promoDiscountPreview = appliedPromo ? round2((subtotal * appliedPromo.value) / 100) : 0
  const pointsCash = Math.min(pointsToCash(heldPoints), Math.max(0, subtotal - promoDiscountPreview))
  const pointsRedeemed = Math.round(pointsCash * 100)

  const { promoDiscount, total } = calculateTotals({
    subtotal,
    promoCode: appliedPromo,
    loyaltyDiscount: pointsCash,
    shippingFee,
  })

  return {
    total: round2(Math.max(0, total)),
    subtotal,
    shippingFee,
    discountAmount: round2(promoDiscount + pointsCash),
    promoCode: appliedPromo?.code ?? null,
    pointsRedeemed,
    shippingMethod,
    items,
  }
}

// ── Fulfilment ───────────────────────────────────────────────────────────────

export type CheckoutResult = {
  kind: CheckoutIntent['kind']
  order?: Order
  voucher?: Awaited<ReturnType<typeof createCashVoucher>>['voucher']
}

export async function fulfillCheckout(
  intent: CheckoutIntent,
  amount: CheckoutAmount,
  payment: FulfillmentPayment,
): Promise<CheckoutResult> {
  if (intent.kind === 'cash_voucher') return fulfillVoucher(intent, payment)
  return fulfillProductOrder(intent, amount, payment)
}

async function fulfillVoucher(
  intent: VoucherCheckoutIntent,
  payment: FulfillmentPayment,
): Promise<CheckoutResult> {
  if (payment.method !== 'card') {
    throw new Error('Cash vouchers must be paid by card.')
  }

  // Voucher value is derived from the CAPTURED total (not the client), so the
  // redeemable value can never be inflated.
  const voucherValue = voucherValueFromTotal(payment.amount)
  if (voucherValue <= 0) throw new Error('Captured amount is below the minimum.')

  const result = await createCashVoucher({
    amount: voucherValue,
    recipientName: intent.recipientName.trim(),
    recipientEmail: intent.recipientEmail?.trim() ?? null,
    paymentMethod: 'card',
    paymentReference: payment.captureId,
  })

  if (!result.success || !result.voucher) {
    throw new Error(result.message ?? 'Payment captured but the voucher could not be created.')
  }

  return { kind: 'cash_voucher', voucher: result.voucher }
}

// Records the server-trusted create_order args keyed by the PayPal order id, so
// the paypal-webhook can fulfill if the buyer's browser never reaches the capture
// step. Non-fatal: a failure here just means we fall back to the browser path.
export async function savePendingCheckout(
  paypalOrderId: string,
  userId: string,
  intent: ProductCheckoutIntent,
  amount: CheckoutAmount,
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('pending_checkout').insert({
    paypal_order_id: paypalOrderId,
    user_id: userId,
    payload: {
      items: amount.items ?? [],
      address_id: intent.fulfillment === 'deliver' ? intent.shippingAddressId : null,
      fulfillment: intent.fulfillment,
      payment_method: intent.paymentMethod,
      shipping_fee: amount.shippingFee,
      discount_amount: amount.discountAmount,
      promo_code: amount.promoCode,
      total_amount: amount.total,
      points_redeemed: amount.pointsRedeemed,
    },
  })
}

async function fulfillProductOrder(
  intent: ProductCheckoutIntent,
  amount: CheckoutAmount,
  payment: FulfillmentPayment,
): Promise<CheckoutResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('create_order', {
      p_items: amount.items ?? [],
      p_address_id: intent.fulfillment === 'deliver' ? intent.shippingAddressId : null,
      p_fulfillment: intent.fulfillment,
      p_payment_method: intent.paymentMethod,
      p_shipping_fee: amount.shippingFee,
      p_discount_amount: amount.discountAmount,
      p_promo_code: amount.promoCode,
      p_total_amount: amount.total,
      p_paypal_order_id: payment.method === 'card' ? payment.paypalOrderId : null,
      p_paypal_capture_id: payment.method === 'card' ? payment.captureId : null,
      p_points_redeemed: amount.pointsRedeemed,
    })
    .single<Order>()

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create the order.')
  }

  return { kind: 'product', order: data }
}
