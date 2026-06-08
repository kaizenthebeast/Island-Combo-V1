import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createPayPalOrder } from '@/lib/paypal'
import { resolveCheckoutAmount } from '@/lib/checkout/checkout'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

const MAX_AMOUNT = 100_000

// POST /api/paypal/orders → creates a PayPal order for a cash voucher purchase.
// This is the voucher-specific entrypoint kept for the existing voucher UI; the
// amount is resolved through the shared checkout core (the same one /api/checkout
// uses), so voucher and product pricing stay in one place.
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

    // Buyer is charged the voucher value plus the convenience fee (computed by
    // the shared core). requestId is the client's idempotency key.
    const { total } = await resolveCheckoutAmount({
      kind: 'cash_voucher',
      amount,
      recipientName: 'pending', // real recipient is captured at the capture step
    })

    const order = await createPayPalOrder(
      total,
      typeof requestId === 'string' ? requestId : undefined,
    )

    return apiOk({ data: { id: order.id } }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
