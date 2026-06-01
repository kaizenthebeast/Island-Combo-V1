import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createPayPalOrder } from '@/lib/paypal'
import { chargeTotal } from '@/lib/cashVoucherPricing'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

const MAX_AMOUNT = 100_000

// POST /api/paypal/orders → creates a PayPal order for a cash voucher purchase.
// The amount is validated and rounded server-side; it is the value the buyer
// will be charged and, after capture, the voucher's value.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized access', HTTP.UNAUTHORIZED)

    const { amount, requestId } = await req.json()

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return apiError('A valid amount is required.', HTTP.BAD_REQUEST)
    }
    if (amount > MAX_AMOUNT) {
      return apiError(`Amount cannot exceed ${MAX_AMOUNT}.`, HTTP.BAD_REQUEST)
    }

    // Buyer is charged the voucher value plus the convenience fee.
    // requestId is the client's idempotency key (stable per payment attempt).
    const order = await createPayPalOrder(
      chargeTotal(amount),
      typeof requestId === 'string' ? requestId : undefined,
    )

    return apiOk({ data: { id: order.id } }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
