import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getMyOrderDetail } from '@/lib/orders/orders'
import { getReviewableProductsForOrder } from '@/features/reviews/api/review'
import ReviewableProducts from './ReviewableProducts'
import type { OrderStatus } from '@/shared/types/order'

const formatUsd = (n: number) =>
  `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

// status chip styling
const STATUS_STYLE: Record<OrderStatus, { label: string; className: string }> = {
  pending:          { label: 'Pending',          className: 'bg-warning-tint text-warning' },
  paid:             { label: 'Paid',             className: 'bg-success-tint text-success' },
  shipped:          { label: 'Shipped',          className: 'bg-brand-tint text-brand' },
  out_for_delivery: { label: 'Out for delivery', className: 'bg-brand-tint text-brand' },
  delivered:        { label: 'Delivered',        className: 'bg-success-tint text-success' },
  completed:        { label: 'Completed',        className: 'bg-success-tint text-success' },
  cancelled:        { label: 'Cancelled',        className: 'bg-danger-tint text-danger' },
}

const CustomerOrderPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params // the public UUID ref
  if (!id) notFound()

  const detail = await getMyOrderDetail(id)
  if (!detail) notFound()

  const { order, items } = detail
  // Once an order is completed the buyer can review each product they bought.
  const reviewable =
    order.order_status === 'completed'
      ? await getReviewableProductsForOrder(order.order_id)
      : []
  const status = STATUS_STYLE[order.order_status] ?? STATUS_STYLE.pending
  const itemsSubtotal = items.reduce((sum, i) => sum + i.line_total, 0)
  const isCod = order.payment_method === 'cod'
  const isPickup = order.shipping_address?.startsWith('Store Pickup') ?? false
  // Short, non-sequential order number shown to the customer (from public_ref).
  const orderNo = order.public_ref.replace(/-/g, '').slice(0, 8).toUpperCase()

  return (
    <section className="section-container max-w-3xl space-y-6 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Continue shopping
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order #{orderNo}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-border bg-white">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.product_name ?? `Item #${item.variant_id ?? item.id}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.sku ? `${item.sku} · ` : ''}Qty {item.quantity} × {formatUsd(item.price)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium">{formatUsd(item.line_total)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-2 border-t border-border px-5 py-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatUsd(itemsSubtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount{order.promo_code ? ` (${order.promo_code})` : ''}</span>
              <span>- {formatUsd(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span>{order.shipping_fee > 0 ? formatUsd(order.shipping_fee) : 'Free'}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>{isCod ? (isPickup ? 'Total due at pickup' : 'Total due on delivery') : 'Total paid'}</span>
            <span>{order.total_amount != null ? formatUsd(order.total_amount) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Delivery + payment */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold">{isPickup ? 'Pickup' : 'Delivery'}</h2>
          <p className="text-sm text-muted-foreground">{order.shipping_address}</p>
          {order.phone_number && (
            <p className="mt-1 text-sm text-muted-foreground">{order.phone_number}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold">Payment</h2>
          <p className="text-sm text-muted-foreground">
            {isCod ? (isPickup ? 'Cash on pickup' : 'Cash on delivery') : 'Card / Online'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCod
              ? isPickup
                ? 'Pay with cash when you collect your order.'
                : 'Pay with cash when your order arrives.'
              : 'Paid online.'}
          </p>
        </div>
      </div>

      {/* Leave a review — completed orders only */}
      <ReviewableProducts products={reviewable} />
    </section>
  )
}

export default CustomerOrderPage
