'use server'
/** Admin order fulfillment reads. Staff-only — enforced both here (fast 403) and
 *  inside the SECURITY DEFINER RPCs (is_staff()) as the real boundary. */

import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/auth'
import { getOrderEvents } from '@/lib/payments/transaction-events'
import type { PaginatedInput, PaginatedResult } from '@/lib/admin/_shared'
import type { AdminOrderListRow, AdminOrderDetail } from '@/lib/types/order'
import type { TransactionEvent } from '@/lib/types/transaction-event'

export type OrdersSortKey = 'created_at' | 'total_amount' | 'order_status'

// NOTE on authz: staff/admin access is enforced inside the RPCs via is_staff(),
// which reads profile.role from the DB — the authoritative source of truth. We
// deliberately do NOT gate on the JWT `user_role` claim here, because that claim
// is only populated by the access-token hook and may be absent/stale, which
// would lock out a legitimate admin whose DB role is correct.

// Paginated, filterable order list for the fulfillment dashboard.
// `filter` = order status, `payment` = payment method.
export const getOrdersPage = async (
  input: PaginatedInput<OrdersSortKey> & { payment?: string },
): Promise<PaginatedResult<AdminOrderListRow>> => {
  const {
    page,
    pageSize,
    search,
    filter,
    payment,
    sortKey = 'created_at',
    sortDir = 'desc',
  } = input

  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_list_orders', {
    p_search: search ?? null,
    p_status: filter ?? null,
    p_payment: payment ?? null,
    p_sort_key: sortKey,
    p_sort_dir: sortDir,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  })

  if (error) return { success: false, status: 403, message: error.message }

  const raw = (data ?? []) as (AdminOrderListRow & { total_count: number | string })[]
  const total = raw.length > 0 ? Number(raw[0].total_count) : 0

  const rows: AdminOrderListRow[] = raw.map((r) => ({
    order_id: Number(r.order_id),
    user_id: r.user_id,
    order_status: r.order_status,
    payment_method: r.payment_method,
    total_amount: r.total_amount,
    shipping_fee: r.shipping_fee,
    discount_amount: r.discount_amount,
    promo_code: r.promo_code,
    created_at: r.created_at,
    updated_at: r.updated_at,
    customer_name: r.customer_name,
    email: r.email,
    phone_number: r.phone_number,
    total_qty: Number(r.total_qty),
    item_count: Number(r.item_count),
  }))

  return { success: true, status: 200, rows, total }
}

export type OrderDetailResult =
  | { success: true; status: 200; detail: AdminOrderDetail; timeline: TransactionEvent[] }
  | { success: false; status: number; message: string }

// Full order detail (header, customer, line items) + chronological timeline.
// Authz enforced by the RPC's is_staff() (see note above).
export const getOrderDetail = async (orderId: number): Promise<OrderDetailResult> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_get_order', { p_order_id: orderId })

  if (error) return { success: false, status: 403, message: error.message }
  if (!data) return { success: false, status: 404, message: 'Order not found' }

  const timeline = await getOrderEvents(orderId)
  return { success: true, status: 200, detail: data as AdminOrderDetail, timeline }
}

// MUTATION — push an order through its lifecycle. The status whitelist is checked
// by the route; staff authorization is enforced here AND inside the RPC (is_staff).
export type UpdateOrderStatusResult =
  | { success: true; status: 200; data: unknown }
  | { success: false; status: number; message: string }

export const updateOrderStatus = async (
  orderId: number,
  status: string,
  deliveryNotes: string | null,
): Promise<UpdateOrderStatusResult> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_status: status,
    p_delivery_notes: deliveryNotes,
  })

  if (error) return { success: false, status: 400, message: error.message }
  return { success: true, status: 200, data }
}
