'use server'

/**
 * Customer-facing order reads — the buyer's own Order History and Order Details.
 *
 * Unlike the admin reads (lib/admin/orders), these don't go through a
 * SECURITY DEFINER RPC: the `orders` / `order_items` / `transaction_event`
 * tables all carry an owner-scoped SELECT policy (orders_select etc.), so a
 * plain query already returns only the caller's rows. Ownership is the RLS
 * boundary — a non-owned order id simply yields no row (→ 404 at the route).
 */

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { getOrderEvents } from '@/lib/payments/transaction-events'
import type {
  Order,
  AdminOrderItem,
  OrderHistoryRow,
  OrderHistoryPage,
  CustomerOrderDetail,
} from '@/lib/types/order'

const MAX_PAGE_SIZE = 50

// Order History: a paginated list of the caller's past orders, newest first.
// `status` optionally filters to a single lifecycle state.
export const getMyOrdersPage = async (input: {
  page?: number
  pageSize?: number
  status?: string
}): Promise<OrderHistoryPage> => {
  const user = await requireUser()
  if (!user) throw new Error('Unauthorized')

  const page = Math.max(1, Math.trunc(input.page ?? 1))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(input.pageSize ?? 10)))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select(
      'order_id, public_ref, order_status, payment_method, total_amount, shipping_fee, discount_amount, promo_code, created_at, updated_at, order_items(quantity)',
      { count: 'exact' },
    )
    // RLS already restricts to the caller; the explicit filter keeps the query
    // index-friendly (orders_user_id_idx) and the intent obvious.
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (input.status) query = query.eq('order_status', input.status)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  type RawRow = Omit<OrderHistoryRow, 'item_count' | 'total_qty'> & {
    order_items: { quantity: number }[] | null
  }

  const rows: OrderHistoryRow[] = ((data ?? []) as RawRow[]).map((o) => {
    const items = o.order_items ?? []
    return {
      order_id: Number(o.order_id),
      public_ref: o.public_ref,
      order_status: o.order_status,
      payment_method: o.payment_method,
      total_amount: o.total_amount,
      shipping_fee: o.shipping_fee,
      discount_amount: o.discount_amount,
      promo_code: o.promo_code,
      created_at: o.created_at,
      updated_at: o.updated_at,
      item_count: items.length,
      total_qty: items.reduce((sum, i) => sum + (i.quantity ?? 0), 0),
    }
  })

  return { rows, total: count ?? 0, page, pageSize }
}

// Order Details: a single order's header, line items, and timeline/tracking
// updates. Returns null when the order doesn't exist OR isn't the caller's
// (RLS makes those indistinguishable, which is the desired behavior).
// Looked up by the public UUID ref (what customer URLs carry) — never the
// internal order_id. RLS still scopes to the owner.
export const getMyOrderDetail = async (
  publicRef: string,
): Promise<CustomerOrderDetail | null> => {
  const user = await requireUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('public_ref', publicRef)
    .maybeSingle<Order>()

  if (error) throw new Error(error.message)
  if (!order) return null

  const orderId = order.order_id

  // Line items with the product name + SKU (FKs: order_items → product_variants
  // → products), ordered for a stable display.
  const { data: itemRows, error: itemErr } = await supabase
    .from('order_items')
    .select('id, variant_id, quantity, price, product_variants(sku, products(name))')
    .eq('order_id', orderId)
    .order('id', { ascending: true })

  if (itemErr) throw new Error(itemErr.message)

  type RawItem = {
    id: number
    variant_id: number | null
    quantity: number
    price: number
    product_variants: { sku: string | null; products: { name: string | null } | null } | null
  }

  // Cast through unknown: variant_id/product_id are to-one FKs, so PostgREST
  // returns nested objects at runtime even though supabase-js infers arrays.
  const items: AdminOrderItem[] = ((itemRows ?? []) as unknown as RawItem[]).map((r) => ({
    id: Number(r.id),
    variant_id: r.variant_id,
    quantity: r.quantity,
    price: r.price,
    line_total: r.price * r.quantity,
    sku: r.product_variants?.sku ?? null,
    product_name: r.product_variants?.products?.name ?? null,
  }))

  // Timeline/tracking updates (status changes + timestamps). transaction_event's
  // RLS scopes these to the order's owner, same as above.
  const timeline = await getOrderEvents(orderId)

  return { order, items, timeline }
}
