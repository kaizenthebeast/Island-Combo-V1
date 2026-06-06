import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'
import { getMyOrderDetail } from '@/lib/orders/orders'

// GET /api/orders/:orderId
// Fetch Order Details: a single order's line items, final pricing, shipping
// address, and timeline/tracking updates. Ownership is enforced by RLS — an
// order that isn't the caller's reads as "not found".
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { orderId } = await params // the public UUID ref, not the internal id
    if (!orderId) {
      return apiError('A valid order id is required.', HTTP.BAD_REQUEST)
    }

    const detail = await getMyOrderDetail(orderId)
    if (!detail) return apiError('Order not found.', HTTP.NOT_FOUND)

    return apiOk({ data: detail })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
