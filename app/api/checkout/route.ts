import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'
import { resolveCheckoutAmount, fulfillCheckout, savePendingCheckout } from '@/lib/checkout/checkout'
import { createPayPalOrder, capturePayPalOrder } from '@/lib/payments/paypal'
import type { CheckoutIntent } from '@/lib/types/order'

// Amounts are settled in money; allow a one-cent rounding tolerance when
// matching a PayPal capture against the server-computed total.
const AMOUNT_TOLERANCE = 0.01

// Unified checkout endpoint for BOTH product orders and cash vouchers, COD and
// card. Card is inherently two-phase (PayPal needs the order id to render the
// approval, capture happens after the buyer approves), so the body carries a
// `phase`:
//   create  → validate + compute the server-trusted total; COD fulfils now,
//             card returns a PayPal order id to approve.
//   capture → capture the approved PayPal order, verify the amount, then fulfil.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body = await req.json()
    const { phase, intent, paypalOrderId, requestId } = body as {
      phase?: 'create' | 'capture'
      intent?: CheckoutIntent
      paypalOrderId?: string
      requestId?: string
    }

    const validationError = validateIntent(intent)
    if (validationError) return apiError(validationError, HTTP.BAD_REQUEST)
    const checkoutIntent = intent as CheckoutIntent

    if (phase === 'create') {
      const amount = await resolveCheckoutAmount(checkoutIntent)

      // COD (product only): no money movement — fulfil immediately.
      if (checkoutIntent.kind === 'product' && checkoutIntent.paymentMethod === 'cod') {
        const result = await fulfillCheckout(checkoutIntent, amount, { method: 'cod' })
        return apiOk({ data: result }, { status: HTTP.CREATED })
      }

      // Card (product or voucher): create the PayPal order to approve.
      const order = await createPayPalOrder(
        amount.total,
        typeof requestId === 'string' ? requestId : undefined,
        checkoutIntent.kind === 'product' ? 'Island Combo Order' : 'Island Combo Cash Voucher',
      )
      // Stash the resolved product order so the paypal-webhook can fulfill it even
      // if the buyer's browser never completes the capture step. Non-fatal.
      if (checkoutIntent.kind === 'product') {
        await savePendingCheckout(order.id, user.id, checkoutIntent, amount).catch(() => {})
      }
      return apiOk({ data: { id: order.id } }, { status: HTTP.CREATED })
    }

    if (phase === 'capture') {
      if (!paypalOrderId) return apiError('A PayPal order id is required.', HTTP.BAD_REQUEST)

      // Capture first — this is where the money actually moves.
      const payment = await capturePayPalOrder(paypalOrderId)

      // Re-derive the expected total server-side and verify the capture matches,
      // so a tampered client total can never change what gets fulfilled.
      const amount = await resolveCheckoutAmount(checkoutIntent)
      if (Math.abs(payment.amount - amount.total) > AMOUNT_TOLERANCE) {
        return apiError('Captured amount did not match the order total.', HTTP.BAD_REQUEST)
      }

      const result = await fulfillCheckout(checkoutIntent, amount, {
        method: 'card',
        captureId: payment.captureId,
        paypalOrderId,
        amount: payment.amount,
      })
      return apiOk({ data: result }, { status: HTTP.CREATED })
    }

    return apiError('Invalid checkout phase.', HTTP.BAD_REQUEST)
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// Shape validation only — values (prices, totals, ownership) are enforced server
// side by the checkout core and the create_order RPC.
function validateIntent(intent: CheckoutIntent | undefined): string | null {
  if (!intent || typeof intent !== 'object') return 'Checkout details are required.'

  if (intent.kind === 'product') {
    if (!Array.isArray(intent.selectedVariantIds) || intent.selectedVariantIds.length === 0) {
      return 'Select at least one item to check out.'
    }
    if (intent.fulfillment !== 'deliver' && intent.fulfillment !== 'pickup') {
      return 'Choose how you want to receive your order.'
    }
    if (intent.fulfillment === 'deliver' && !intent.shippingAddressId) {
      return 'Select a delivery address to continue.'
    }
    if (intent.paymentMethod !== 'cod' && intent.paymentMethod !== 'card') {
      return 'Choose a payment method.'
    }
    return null
  }

  if (intent.kind === 'cash_voucher') {
    if (typeof intent.amount !== 'number' || !Number.isFinite(intent.amount) || intent.amount <= 0) {
      return 'A valid voucher amount is required.'
    }
    if (typeof intent.recipientName !== 'string' || !intent.recipientName.trim()) {
      return 'Recipient name is required.'
    }
    return null
  }

  return 'Unknown checkout type.'
}
