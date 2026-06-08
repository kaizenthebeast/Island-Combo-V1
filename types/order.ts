/** Shared order + unified-checkout types. */

import type { TransactionEvent } from '@/types/transaction-event'

// A checkout is one of two "kinds" of purchase that flow through the same
// pipeline (lib/checkout/checkout.ts + /api/checkout): a product order or a
// cash voucher. Both are, at the end of the day, just products being bought.

export type ProductPaymentMethod = 'cod' | 'card'
export type Fulfillment = 'deliver' | 'pickup'

// Buying items from the cart. Item prices/quantities are NEVER taken from this
// payload — the server re-reads them from cart_view. The client only says WHICH
// selected rows to check out and how it wants to pay/ship.
export type ProductCheckoutIntent = {
  kind: 'product'
  selectedVariantIds: number[]
  fulfillment: Fulfillment
  shippingAddressId: number | null // required when fulfillment === 'deliver'
  paymentMethod: ProductPaymentMethod
  promoCode?: string | null
  useLoyalty?: boolean
}

// Buying a cash voucher. Always paid by card (PayPal). The amount is the
// voucher's redeemable value; the buyer is charged value + convenience fee.
export type VoucherCheckoutIntent = {
  kind: 'cash_voucher'
  amount: number
  recipientName: string
  recipientEmail?: string | null
}

export type CheckoutIntent = ProductCheckoutIntent | VoucherCheckoutIntent

// Server-resolved line item, priced from cart_view (tier-aware) — passed to the
// create_order RPC, which re-validates stock and clamps the price.
export type ResolvedOrderItem = {
  variant_id: number
  quantity: number
  unit_price: number
}

// Server-trusted amount breakdown for a checkout. `total` is what the buyer is
// charged (and, for card, what the PayPal capture is verified against).
export type CheckoutAmount = {
  total: number
  subtotal: number
  shippingFee: number
  discountAmount: number // promo + loyalty combined
  promoCode: string | null
  pointsRedeemed: number // loyalty points consumed at checkout (debited atomically)
  shippingMethod: 'GCR' | 'QPI' | null
  // Product only — the resolved, tier-priced line items.
  items?: ResolvedOrderItem[]
}

// Payment context handed to fulfilment. COD has no money movement; card carries
// the confirmed PayPal capture so fulfilment can record + idempotency-key on it.
export type FulfillmentPayment =
  | { method: 'cod' }
  | { method: 'card'; captureId: string; paypalOrderId: string; amount: number }

// Canonical order-status lifecycle (lowercase in the DB; UI renders pretty
// labels). `delivered` (card) and `completed` (COD cash collected) are the
// terminal-success states that accrue loyalty points.
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'

// A row of public.orders (after the 0007 migration adds shipping_fee/total_amount).
export type Order = {
  order_id: number          // internal id — never shown to customers
  public_ref: string        // unguessable UUID used in all customer-facing URLs
  user_id: string
  order_status: OrderStatus
  shipping_address: string
  phone_number: string
  payment_method: string
  sync_status: 'pending' | 'synced' | 'failed' | null
  paypal_order_id: string | null
  paypal_capture_id: string | null
  paypal_payer_email: string | null
  discount_amount: number
  promo_code: string | null
  shipping_fee: number
  total_amount: number | null
  created_at: string
  updated_at: string
}

// ── Admin order management ────────────────────────────────────────────────────

// One row of the admin order list (public.admin_list_orders RPC).
export type AdminOrderListRow = {
  order_id: number
  user_id: string | null
  order_status: OrderStatus
  payment_method: string
  total_amount: number | null
  shipping_fee: number | null
  discount_amount: number | null
  promo_code: string | null
  created_at: string
  updated_at: string
  customer_name: string | null
  email: string | null
  phone_number: string | null
  total_qty: number
  item_count: number
}

// A resolved line item in the admin order detail.
export type AdminOrderItem = {
  id: number
  variant_id: number | null
  quantity: number
  price: number
  line_total: number
  sku: string | null
  product_name: string | null
}

// Full admin order detail (public.admin_get_order RPC) + timeline read alongside.
export type AdminOrderDetail = {
  order: Order
  customer: {
    user_id?: string | null
    name?: string | null
    email?: string | null
    phone_text?: string | null
  }
  items: AdminOrderItem[]
}

// ── Customer-facing order reads (Order History + Order Details) ──────────────

// The lead item shown on an order-history card (image, variant, price).
export type OrderItemSummary = {
  product_id: number | null
  slug: string | null
  product_name: string
  variant_label: string | null    // e.g. "US: 10.5, Black"
  quantity: number
  unit_price: number
  original_price: number | null   // pre-discount unit price, when discounted
  discount_percent: number | null
  image_url: string | null
}

// One row of the buyer's own order history. High-level summary only; the full
// breakdown lives in the order detail. Read straight from `orders` (RLS scopes
// rows to the owner), with the item aggregates computed alongside.
export type OrderHistoryRow = {
  order_id: number
  public_ref: string
  order_status: OrderStatus
  payment_method: string
  total_amount: number | null
  shipping_fee: number | null
  discount_amount: number | null
  promo_code: string | null
  created_at: string
  updated_at: string
  item_count: number
  total_qty: number

  // Card display + tracking
  primary_item: OrderItemSummary | null
  delivered_at: string | null       // when it was delivered (tracking badge)
  expected_delivery: string | null  // estimated arrival while in transit
  my_rating: number | null          // the buyer's existing rating for the lead item
  can_review: boolean               // delivered/completed + not yet reviewed
}

// A page of order history, with the total count so the client can paginate.
export type OrderHistoryPage = {
  rows: OrderHistoryRow[]
  total: number
  page: number
  pageSize: number
}

// Shipment/tracking facts for the order-tracking sheet (from order_fulfillment).
export type OrderTrackingInfo = {
  status: string
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
}

// The buyer's view of a single order: header, line items, and the
// timeline/tracking updates (status changes + timestamps) from transaction_event.
// Line items share the AdminOrderItem shape (same columns). Ownership is enforced
// by RLS — a non-owned order simply isn't returned.
export type CustomerOrderDetail = {
  order: Order
  items: AdminOrderItem[]
  timeline: TransactionEvent[]
  fulfillment: OrderTrackingInfo | null
}
