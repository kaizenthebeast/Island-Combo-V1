import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'
import type { OrderStatus } from '@/lib/types/order'

const VALID_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled',
]

// POST /api/admin/orders/:orderId/status
// The fulfillment tool: pushes an order through its lifecycle. The DB RPC
// (is_staff-checked) updates the status, appends a timeline entry, and accrues
// loyalty points on the first `delivered`/`completed` transition.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Require an authenticated caller for a clean 401; staff/admin authorization
    // itself is enforced in the RPC via is_staff() (DB-backed), not the JWT role
    // claim (which may be absent/stale).
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { orderId } = await params
    const id = Number(orderId)
    if (!Number.isInteger(id) || id <= 0) {
      return apiError('A valid order id is required.', HTTP.BAD_REQUEST)
    }

    const body = (await req.json()) ?? {}
    const { status, delivery_notes } = body as { status?: string; delivery_notes?: string }

    if (!status || !VALID_STATUSES.includes(status as OrderStatus)) {
      return apiError('A valid status is required.', HTTP.BAD_REQUEST)
    }
    if (delivery_notes !== undefined && delivery_notes !== null && typeof delivery_notes !== 'string') {
      return apiError('delivery_notes must be a string.', HTTP.BAD_REQUEST)
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('admin_update_order_status', {
      p_order_id: id,
      p_status: status,
      p_delivery_notes: delivery_notes ?? null,
    })

    if (error) return apiError(error.message, HTTP.BAD_REQUEST)

    // Refresh the admin list + this order's detail so the new status/timeline show.
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${id}`)

    return apiOk({ data, message: 'Order status updated.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
