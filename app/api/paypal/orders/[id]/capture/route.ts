import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { capturePayPalOrder } from '@/lib/paypal'
import { fulfillCheckout, resolveCheckoutAmount } from '@/lib/checkout/checkout'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

// POST /api/paypal/orders/:id/capture
// Voucher-specific capture entrypoint (kept for the existing voucher UI). It
// captures the approved PayPal order, then fulfils through the shared checkout
// core — which, only after a confirmed capture, derives the voucher value from
// the captured total and creates the voucher.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized access', HTTP.UNAUTHORIZED)

    const { id } = await params
    if (!id) return apiError('Order id is required.', HTTP.BAD_REQUEST)

    const { recipientName, recipientEmail } = await req.json()
    if (typeof recipientName !== 'string' || !recipientName.trim()) {
      return apiError('Recipient name is required.', HTTP.BAD_REQUEST)
    }

    // Capture the payment first — this is where the money actually moves.
    const payment = await capturePayPalOrder(id)

    const intent = {
      kind: 'cash_voucher' as const,
      amount: payment.amount, // unused for fulfilment; value derives from capture
      recipientName: recipientName.trim(),
      recipientEmail: typeof recipientEmail === 'string' ? recipientEmail.trim() : null,
    }

    const amount = await resolveCheckoutAmount(intent)
    const result = await fulfillCheckout(intent, amount, {
      method: 'card',
      captureId: payment.captureId,
      paypalOrderId: id,
      amount: payment.amount,
    })

    if (!result.voucher) {
      // Payment succeeded but fulfilment failed — surface it so it can be
      // reconciled against the capture id `payment.captureId`.
      return apiError('Payment captured but the voucher could not be created.', HTTP.INTERNAL)
    }

    return apiOk({ data: { voucher: result.voucher } }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
