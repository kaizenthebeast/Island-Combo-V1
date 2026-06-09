import { NextRequest } from 'next/server'
import { requireUser } from '@/features/auth/api'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'
import { getMyOrdersPage } from '@/features/orders/api/orders'
import { ORDER_STATUSES } from '@/features/orders/api/order-status'
import type { OrderStatus } from '@/shared/types/order'

// GET /api/orders?page=1&pageSize=10&status=shipped
// Fetch Order History: a paginated list of the caller's own past orders with
// high-level details (id, date, total, status, item count). Ownership is
// enforced by RLS inside the read.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { searchParams } = new URL(req.url)

    const page = Number(searchParams.get('page') ?? '1')
    const pageSize = Number(searchParams.get('pageSize') ?? '10')
    if (!Number.isFinite(page) || !Number.isFinite(pageSize)) {
      return apiError('page and pageSize must be numbers.', HTTP.BAD_REQUEST)
    }

    const status = searchParams.get('status') ?? undefined
    if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
      return apiError('Invalid status filter.', HTTP.BAD_REQUEST)
    }

    const result = await getMyOrdersPage({ page, pageSize, status })
    return apiOk({ data: result })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
