'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, CheckCircle2, Truck, Star } from 'lucide-react'
import { addProductReview } from '@/lib/reviews/review'
import type { OrderHistoryRow } from '@/lib/types/order'

const PLACEHOLDER = '/images/placeholder.png'

const money = (n: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

// Tabs → the order statuses they include (client-side filter).
const TABS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: 'all',           label: 'All',           statuses: null },
  { key: 'unpaid',        label: 'Unpaid',        statuses: ['pending'] },
  { key: 'processing',    label: 'Processing',    statuses: ['paid'] },
  { key: 'to_receive',    label: 'To Receive',    statuses: ['shipped', 'out_for_delivery'] },
  { key: 'delivered',     label: 'Delivered',     statuses: ['delivered', 'completed'] },
  { key: 'return_refund', label: 'Return/Refund', statuses: ['__none__'] },
  { key: 'cancelled',     label: 'Cancelled',     statuses: ['cancelled'] },
]

// Per-card status pill text + colour.
const CARD_STATUS: Record<string, { label: string; className: string }> = {
  pending:          { label: 'Payment pending', className: 'text-warning' },
  paid:             { label: 'To ship',         className: 'text-warning' },
  shipped:          { label: 'To receive',      className: 'text-warning' },
  out_for_delivery: { label: 'Out for delivery', className: 'text-info' },
  delivered:        { label: 'Delivered',       className: 'text-success' },
  completed:        { label: 'Completed',       className: 'text-success' },
  cancelled:        { label: 'Cancelled',       className: 'text-danger' },
}

export default function OrdersListClient({ initialOrders }: { initialOrders: OrderHistoryRow[] }) {
  const router = useRouter()
  const [tab, setTab] = useState('all')
  const [orders, setOrders] = useState(initialOrders)

  const visible = useMemo(() => {
    const def = TABS.find((t) => t.key === tab)
    if (!def || def.statuses === null) return orders
    const set = new Set(def.statuses)
    return orders.filter((o) => set.has(o.order_status))
  }, [orders, tab])

  // Reflect a just-submitted rating without a refetch.
  const markRated = (orderId: number, rating: number) =>
    setOrders((prev) =>
      prev.map((o) => (o.order_id === orderId ? { ...o, my_rating: rating, can_review: false } : o)),
    )

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:py-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 rounded-md p-1 text-foreground hover:bg-muted sm:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Package className="hidden h-6 w-6 text-foreground sm:block" />
        <h1 className="flex-1 text-center text-lg font-bold sm:flex-none sm:text-2xl">Orders</h1>
      </div>

      {/* Tabs */}
      <div className="-mx-4 mb-2 overflow-x-auto border-b border-border px-4">
        <div className="flex w-max gap-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 pb-2.5 text-sm transition-colors ${
                tab === t.key
                  ? 'border-brand font-semibold text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No orders here yet</p>
          <p className="text-xs text-muted-foreground">Orders in this status will show up here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((o) => (
            <OrderCard key={o.order_id} order={o} onRated={markRated} />
          ))}
        </ul>
      )}
    </section>
  )
}

function OrderCard({
  order, onRated,
}: { order: OrderHistoryRow; onRated: (orderId: number, rating: number) => void }) {
  const status = CARD_STATUS[order.order_status] ?? { label: order.order_status, className: 'text-muted-foreground' }
  const item = order.primary_item

  return (
    <li className="py-5">
      {/* status + view details */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
        <Link href={`/orders/${order.public_ref}`} className="text-sm font-medium text-brand hover:underline">
          View Details
        </Link>
      </div>

      {/* product */}
      <div className="mt-3 flex gap-3 sm:gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted sm:h-24 sm:w-24">
          <Image
            src={item?.image_url ?? PLACEHOLDER}
            alt={item?.product_name ?? 'Order item'}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-foreground">
            {item?.product_name ?? `Order #${order.public_ref.slice(0, 8).toUpperCase()}`}
          </p>
          {item?.variant_label && (
            <p className="mt-0.5 text-xs text-muted-foreground">{item.variant_label}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-muted-foreground">x{item?.quantity ?? order.total_qty}</span>
            <span className="font-semibold text-foreground">{money(item?.unit_price ?? order.total_amount)}</span>
            {item?.original_price != null && (
              <span className="text-xs text-muted-foreground line-through">{money(item.original_price)}</span>
            )}
            {item?.discount_percent != null && (
              <span className="rounded bg-discount px-1.5 py-0.5 text-xs font-medium text-brand">
                -{item.discount_percent}%
              </span>
            )}
          </div>
          {order.item_count > 1 && (
            <p className="mt-1 text-xs text-muted-foreground">+{order.item_count - 1} more item{order.item_count - 1 > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* tracking badge */}
      {(order.delivered_at || order.expected_delivery) && (
        <div className="mt-3 flex sm:justify-end">
          {order.delivered_at ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-success-tint px-3 py-1.5 text-xs font-medium text-success">
              <CheckCircle2 size={14} /> Delivered on {fmtDate(order.delivered_at)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-tint px-3 py-1.5 text-xs font-medium text-brand">
              <Truck size={14} /> Expected delivery: {fmtDate(order.expected_delivery)}
            </span>
          )}
        </div>
      )}

      {/* rating */}
      {order.my_rating != null ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Your rating:</span>
          <Stars value={order.my_rating} readOnly />
        </div>
      ) : order.can_review && item?.product_id != null ? (
        <RateRow
          orderId={order.order_id}
          productId={item.product_id}
          onRated={(r) => onRated(order.order_id, r)}
        />
      ) : null}
    </li>
  )
}

function RateRow({
  orderId, productId, onRated,
}: { orderId: number; productId: number; onRated: (rating: number) => void }) {
  const [hover, setHover] = useState(0)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submit = (rating: number) => {
    setError(null)
    start(async () => {
      const res = await addProductReview({ product_id: productId, order_id: orderId, rating })
      if (!res.success) { setError(res.message); return }
      onRated(rating)
    })
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Rate this item:</span>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onMouseEnter={() => setHover(s)}
            onClick={() => submit(s)}
            aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
            className="disabled:opacity-50"
          >
            <Star size={18} className={hover >= s ? 'fill-warning text-warning' : 'text-muted-foreground'} />
          </button>
        ))}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

function Stars({ value, readOnly }: { value: number; readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={16}
          className={value >= s ? 'fill-warning text-warning' : 'text-muted-foreground'}
          aria-hidden={readOnly}
        />
      ))}
    </div>
  )
}
