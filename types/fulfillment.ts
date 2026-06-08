/** public.order_fulfillment — shipment/tracking for an order, 1:1 (migration 0029). */

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'cancelled'

export type OrderFulfillment = {
  order_id: number
  status: FulfillmentStatus
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

// Fields staff may set when recording tracking (all optional → partial update).
export type OrderFulfillmentInput = {
  status?: FulfillmentStatus
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
}
