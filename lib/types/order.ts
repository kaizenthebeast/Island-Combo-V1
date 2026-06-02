/** Shared order + unified-checkout types. */

// A checkout is one of two "kinds" of purchase that flow through the same
// pipeline (lib/checkout/checkout.ts + /api/checkout): a product order or a
// cash voucher. Both are, at the end of the day, just products being bought.

export type ProductPaymentMethod = 'cod' | 'card'
export type Fulfillment = 'deliver' | 'pickup'

// Buying items from the cart. Item prices/quantities are NEVER taken from this
// payload — the server re-reads them from cart_view. The client only says WHICH
// selected rows to check out and how it wants to pay/ship.
export type ProductCheckoutIntent = {
  kind: 'product'
  selectedVariantIds: number[]
  fulfillment: Fulfillment
  shippingAddressId: number | null // required when fulfillment === 'deliver'
  paymentMethod: ProductPaymentMethod
  promoCode?: string | null
  useLoyalty?: boolean
}

// Buying a cash voucher. Always paid by card (PayPal). The amount is the
// voucher's redeemable value; the buyer is charged value + convenience fee.
export type VoucherCheckoutIntent = {
  kind: 'cash_voucher'
  amount: number
  recipientName: string
  recipientEmail?: string | null
}

export type CheckoutIntent = ProductCheckoutIntent | VoucherCheckoutIntent

// Server-resolved line item, priced from cart_view (tier-aware) — passed to the
// create_order RPC, which re-validates stock and clamps the price.
export type ResolvedOrderItem = {
  variant_id: number
  quantity: number
  unit_price: number
}

// Server-trusted amount breakdown for a checkout. `total` is what the buyer is
// charged (and, for card, what the PayPal capture is verified against).
export type CheckoutAmount = {
  total: number
  subtotal: number
  shippingFee: number
  discountAmount: number // promo + loyalty combined
  promoCode: string | null
  shippingMethod: 'GCR' | 'QPI' | null
  // Product only — the resolved, tier-priced line items.
  items?: ResolvedOrderItem[]
}

// Payment context handed to fulfilment. COD has no money movement; card carries
// the confirmed PayPal capture so fulfilment can record + idempotency-key on it.
export type FulfillmentPayment =
  | { method: 'cod' }
  | { method: 'card'; captureId: string; paypalOrderId: string; amount: number }

// A row of public.orders (after the 0007 migration adds shipping_fee/total_amount).
export type Order = {
  order_id: number
  user_id: string
  order_status: 'pending' | 'preparing' | 'completed'
  shipping_address: string
  phone_number: string
  payment_method: string
  sync_status: 'pending' | 'synced' | 'failed' | null
  paypal_order_id: string | null
  paypal_capture_id: string | null
  paypal_payer_email: string | null
  discount_amount: number
  promo_code: string | null
  shipping_fee: number
  total_amount: number | null
  created_at: string
  updated_at: string
}
