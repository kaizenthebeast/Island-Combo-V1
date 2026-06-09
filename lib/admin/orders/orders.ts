'use server'
/** Admin order fulfillment reads. Staff-only — enforced both here (fast 403) and
 *  inside the SECURITY DEFINER RPCs (is_staff()) as the real boundary. */

import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/features/auth/api'
import { verifyCurrentUserPassword } from '@/features/auth/api/reauth'
import { getOrderEvents } from '@/features/payments/api/transaction-events'
import type { PaginatedInput, PaginatedResult } from '@/lib/admin/_shared'
import type { AdminOrderListRow, AdminOrderDetail } from '@/shared/types/order'
import type { TransactionEvent } from '@/shared/types/transaction-event'
import type { OrderFulfillment, OrderFulfillmentInput } from '@/shared/types/fulfillment'

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
// by the route; staff authorization is enforced here AND inside the RPC (is_staff),
// which records the acting staff/admin in the audit log (transaction_event.actor_id).
// A status change additionally requires the actor to re-enter their password
// (step-up), so an unattended/borrowed session can't silently move orders.
export type UpdateOrderStatusResult =
  | { success: true; status: 200; data: unknown }
  | { success: false; status: number; message: string }

export const updateOrderStatus = async (
  orderId: number,
  status: string,
  deliveryNotes: string | null,
  password: string,
): Promise<UpdateOrderStatusResult> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  // Step-up: confirm it's really them before changing the order.
  if (!password?.trim()) {
    return { success: false, status: 400, message: 'Enter your password to confirm the change.' }
  }
  const verified = await verifyCurrentUserPassword(password)
  if (!verified) {
    return { success: false, status: 401, message: 'Incorrect password — status not changed.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_status: status,
    p_delivery_notes: deliveryNotes,
  })

  if (error) return { success: false, status: 400, message: error.message }
  return { success: true, status: 200, data }
}

// ── Fulfillment / tracking (order_fulfillment, 1:1 with orders) ───────────────
// Staff-only. RLS on order_fulfillment also gates writes to is_staff(), so this
// guard is the fast 403 and the policy is the real boundary.

export type FulfillmentResult =
  | { success: true; status: 200; fulfillment: OrderFulfillment }
  | { success: false; status: number; message: string }

// Upsert the tracking row for an order (insert on first write, update after).
// updated_at is maintained by the order_fulfillment_set_updated_at trigger.
export const setOrderTracking = async (
  orderId: number,
  input: OrderFulfillmentInput,
): Promise<FulfillmentResult> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_fulfillment')
    .upsert({ order_id: orderId, ...input }, { onConflict: 'order_id' })
    .select()
    .single()

  if (error) return { success: false, status: 400, message: error.message }
  return { success: true, status: 200, fulfillment: data as OrderFulfillment }
}

// Read an order's tracking row (null if none recorded yet).
export const getOrderFulfillment = async (
  orderId: number,
): Promise<OrderFulfillment | null> => {
  const auth = await requireStaff()
  if (!auth.ok) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_fulfillment')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as OrderFulfillment | null) ?? null
}

// ── Unified order feed (order_overview view) ─────────────────────────────────
// Physical orders ∪ cash-voucher purchases in one list. `source` is the
// Physical/Voucher ("product type") filter. Staff-only.
export type OrderOverviewSource = 'product' | 'voucher'
export type OrderOverviewRow = {
  source: OrderOverviewSource
  ref: string
  source_id: string
  customer_id: string | null
  customer_email: string | null
  status: string
  payment_method: string | null
  amount: number | null
  created_at: string
}

export const getOrderOverview = async (
  input: { source?: OrderOverviewSource | 'all'; limit?: number; offset?: number } = {},
): Promise<{ success: true; rows: OrderOverviewRow[] } | { success: false; status: number; message: string }> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const limit = Math.min(Math.max(1, input.limit ?? 50), 200)
  const offset = Math.max(0, input.offset ?? 0)

  const supabase = await createClient()
  let query = supabase
    .from('order_overview')
    .select('*')
    .order('created_at', { ascending: false })
  if (input.source && input.source !== 'all') query = query.eq('source', input.source)

  const { data, error } = await query.range(offset, offset + limit - 1)
  if (error) return { success: false, status: 400, message: error.message }
  return { success: true, rows: (data ?? []) as OrderOverviewRow[] }
}
