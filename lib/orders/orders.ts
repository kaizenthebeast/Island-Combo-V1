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
import { getPublicImageUrl } from '@/lib/utils/image-url'
import type {
  Order,
  AdminOrderItem,
  OrderHistoryRow,
  OrderItemSummary,
  OrderHistoryPage,
  CustomerOrderDetail,
  OrderTrackingInfo,
} from '@/lib/types/order'

// PostgREST returns a to-one embed as an object, but its types often widen it to
// an array; normalize to the single related row (or null).
const firstOf = <T>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

const round2 = (n: number) => Math.round(n * 100) / 100
const DELIVERY_ESTIMATE_DAYS = 7

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
      `order_id, public_ref, order_status, payment_method, total_amount, shipping_fee, discount_amount, promo_code, created_at, updated_at,
       order_items( quantity, price, product_name, variant_id,
         product_variants(
           products( product_id, slug, discount ),
           variant_attributes( attribute_value ),
           product_images( image_path, is_primary, sort_order ) ) ),
       order_fulfillment( delivered_at )`,
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

  type RawItem = {
    quantity: number
    price: number
    product_name: string
    variant_id: number | null
    product_variants: {
      products: { product_id: number; slug: string; discount: number | null } | null
      variant_attributes: { attribute_value: string }[] | null
      product_images: { image_path: string; is_primary: boolean; sort_order: number }[] | null
    } | null
  }
  type RawRow = {
    order_id: number; public_ref: string; order_status: OrderHistoryRow['order_status']
    payment_method: string; total_amount: number | null; shipping_fee: number | null
    discount_amount: number | null; promo_code: string | null; created_at: string; updated_at: string
    order_items: RawItem[] | null
    order_fulfillment: { delivered_at: string | null } | { delivered_at: string | null }[] | null
  }

  const RECEIVED = new Set(['delivered', 'completed'])
  const IN_TRANSIT = new Set(['paid', 'shipped', 'out_for_delivery'])

  const baseRows = ((data ?? []) as unknown as RawRow[]).map((o) => {
    const items = o.order_items ?? []
    const lead = items[0] ?? null

    let primary_item: OrderItemSummary | null = null
    if (lead) {
      const pv = firstOf(lead.product_variants)
      const product = firstOf(pv?.products)
      const attrs = (pv?.variant_attributes ?? []).map((a) => a.attribute_value).filter(Boolean)
      const imgs = pv?.product_images ?? []
      const img = imgs.find((i) => i.is_primary) ?? [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
      const discount = product?.discount ?? null
      const unit = Number(lead.price)
      primary_item = {
        product_id: product?.product_id ?? null,
        slug: product?.slug ?? null,
        product_name: lead.product_name,
        variant_label: attrs.length ? attrs.join(', ') : null,
        quantity: lead.quantity,
        unit_price: unit,
        discount_percent: discount && discount > 0 ? discount : null,
        original_price: discount && discount > 0 ? round2(unit / (1 - discount / 100)) : null,
        image_url: img ? getPublicImageUrl(img.image_path) : null,
      }
    }

    const fulfillment = firstOf(o.order_fulfillment)
    const delivered_at =
      fulfillment?.delivered_at ?? (RECEIVED.has(o.order_status) ? o.updated_at : null)
    const expected_delivery =
      !delivered_at && IN_TRANSIT.has(o.order_status)
        ? new Date(new Date(o.created_at).getTime() + DELIVERY_ESTIMATE_DAYS * 86400000).toISOString()
        : null

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
      primary_item,
      delivered_at,
      expected_delivery,
    }
  })

  // The buyer's existing ratings for these orders' lead items (one query).
  const orderIds = baseRows.map((r) => r.order_id)
  const ratingByKey = new Map<string, number>()
  if (orderIds.length) {
    const { data: myReviews } = await supabase
      .from('reviews')
      .select('order_id, product_id, rating')
      .eq('user_id', user.id)
      .in('order_id', orderIds)
    for (const r of myReviews ?? []) ratingByKey.set(`${r.order_id}:${r.product_id}`, r.rating)
  }

  const rows: OrderHistoryRow[] = baseRows.map((r) => {
    const pid = r.primary_item?.product_id ?? null
    const my_rating = pid != null ? ratingByKey.get(`${r.order_id}:${pid}`) ?? null : null
    return {
      ...r,
      my_rating,
      can_review: RECEIVED.has(r.order_status) && pid != null && my_rating == null,
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

  // Line items read straight from the order_items snapshot (product_name + sku
  // are frozen at purchase time — migration 0026), so renames/deletes never
  // rewrite history. Ordered for a stable display.
  const { data: itemRows, error: itemErr } = await supabase
    .from('order_items')
    .select('id, variant_id, quantity, price, product_name, sku')
    .eq('order_id', orderId)
    .order('id', { ascending: true })

  if (itemErr) throw new Error(itemErr.message)

  type RawItem = {
    id: number
    variant_id: number | null
    quantity: number
    price: number
    product_name: string | null
    sku: string | null
  }

  const items: AdminOrderItem[] = ((itemRows ?? []) as RawItem[]).map((r) => ({
    id: Number(r.id),
    variant_id: r.variant_id,
    quantity: r.quantity,
    price: r.price,
    line_total: r.price * r.quantity,
    sku: r.sku,
    product_name: r.product_name,
  }))

  // Timeline/tracking updates (status changes + timestamps). transaction_event's
  // RLS scopes these to the order's owner, same as above.
  const timeline = await getOrderEvents(orderId)

  // Shipment/tracking row (1:1, may not exist yet). RLS scopes it to the owner.
  const { data: fulfillment } = await supabase
    .from('order_fulfillment')
    .select('status, carrier, tracking_number, tracking_url, shipped_at, delivered_at')
    .eq('order_id', orderId)
    .maybeSingle()

  return { order, items, timeline, fulfillment: (fulfillment as OrderTrackingInfo | null) ?? null }
}

// Customer self-cancel for an order that hasn't shipped (pending/paid), with a
// required reason. The RPC (cancel_my_order) cancels an UNPAID order immediately
// (restoring stock + points); a PAID order instead raises a refund request that
// staff validate before anything is cancelled/refunded.
export const cancelMyOrder = async (
  orderId: number,
  reason: string,
  mediaPaths: string[] = [],
): Promise<
  | { success: true; orderStatus: string; refundRequested: boolean }
  | { success: false; message: string }
> => {
  const user = await requireUser()
  if (!user) return { success: false, message: 'Unauthorized' }
  if (!reason?.trim()) return { success: false, message: 'A cancellation reason is required.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cancel_my_order', {
    p_order_id: orderId,
    p_reason: reason.trim(),
    p_media: mediaPaths,
  })

  if (error) return { success: false, message: error.message }
  const res = (data ?? {}) as { order_status?: string; refund_requested?: boolean }
  return { success: true, orderStatus: res.order_status ?? 'cancelled', refundRequested: !!res.refund_requested }
}
