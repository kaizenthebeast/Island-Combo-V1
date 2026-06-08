import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { updateOrderStatus } from '@/lib/admin/orders/orders'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'
import type { OrderStatus } from '@/shared/types/order'

const VALID_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled',
]

// POST /api/admin/orders/:id/status
// Thin route: validates input + shapes the response. The DB work and the
// staff authorization live in lib/admin/orders (updateOrderStatus), which also
// goes through the is_staff-checked admin_update_order_status RPC.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params
    const id = Number(orderId)
    if (!Number.isInteger(id) || id <= 0) {
      return apiError('A valid order id is required.', HTTP.BAD_REQUEST)
    }

    const body = (await req.json()) ?? {}
    const { status, delivery_notes, password } = body as {
      status?: string; delivery_notes?: string; password?: string
    }

    if (!status || !VALID_STATUSES.includes(status as OrderStatus)) {
      return apiError('A valid status is required.', HTTP.BAD_REQUEST)
    }
    if (delivery_notes !== undefined && delivery_notes !== null && typeof delivery_notes !== 'string') {
      return apiError('delivery_notes must be a string.', HTTP.BAD_REQUEST)
    }
    if (!password || typeof password !== 'string') {
      return apiError('Your password is required to confirm the change.', HTTP.BAD_REQUEST)
    }

    const result = await updateOrderStatus(id, status, delivery_notes ?? null, password)
    if (!result.success) return apiError(result.message, result.status)

    // Refresh the admin list + this order's detail so the new status/timeline show.
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${id}`)

    return apiOk({ data: result.data, message: 'Order status updated.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
