import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { capturePayPalOrder } from '@/lib/paypal'
import { createCashVoucher } from '@/lib/cashVoucher'
import { voucherValueFromTotal } from '@/lib/cashVoucherPricing'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

// POST /api/paypal/orders/:orderId/capture
// Captures the approved PayPal order, then — only if the capture COMPLETED —
// creates the cash voucher. The voucher's amount comes from PayPal's capture
// response (not the client), and the capture id is stored as payment_reference.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized access', HTTP.UNAUTHORIZED)

    const { orderId } = await params
    if (!orderId) return apiError('Order id is required.', HTTP.BAD_REQUEST)

    const { recipientName, recipientEmail } = await req.json()
    if (typeof recipientName !== 'string' || !recipientName.trim()) {
      return apiError('Recipient name is required.', HTTP.BAD_REQUEST)
    }

    // Capture the payment first — this is where the money actually moves.
    const payment = await capturePayPalOrder(orderId)

    // Voucher value = captured total minus the convenience fee (server-derived,
    // so the client can't inflate the redeemable value).
    const voucherValue = voucherValueFromTotal(payment.amount)
    if (voucherValue <= 0) {
      return apiError('Captured amount is below the minimum.', HTTP.BAD_REQUEST)
    }

    // Fulfil only after a confirmed capture.
    const result = await createCashVoucher({
      amount: voucherValue,
      recipientName: recipientName.trim(),
      recipientEmail: typeof recipientEmail === 'string' ? recipientEmail.trim() : null,
      paymentMethod: 'card',
      paymentReference: payment.captureId,
    })

    if (!result.success || !result.voucher) {
      // Payment succeeded but fulfilment failed — surface it so it can be
      // reconciled against capture id `payment.captureId`.
      return apiError(
        result.message ?? 'Payment captured but the voucher could not be created.',
        HTTP.INTERNAL,
      )
    }

    return apiOk({ data: { voucher: result.voucher } }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
