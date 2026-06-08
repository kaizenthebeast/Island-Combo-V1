'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Package, CheckCircle2, Truck, Star } from 'lucide-react'
import OrderDetailSheet from './OrderDetailSheet'
import OrderReviewSheet from './OrderReviewSheet'
import type { OrderHistoryRow } from '@/shared/types/order'

const PLACEHOLDER = '/images/placeholder.png'
const money = (n: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

const TABS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: 'all',           label: 'All',           statuses: null },
  { key: 'unpaid',        label: 'Unpaid',        statuses: ['pending'] },
  { key: 'processing',    label: 'Processing',    statuses: ['paid'] },
  { key: 'to_receive',    label: 'To Receive',    statuses: ['shipped', 'out_for_delivery'] },
  { key: 'delivered',     label: 'Delivered',     statuses: ['delivered', 'completed'] },
  { key: 'return_refund', label: 'Return/Refund', statuses: ['__none__'] },
  { key: 'cancelled',     label: 'Cancelled',     statuses: ['cancelled'] },
]

const CARD_STATUS: Record<string, { label: string; className: string }> = {
  pending:          { label: 'Payment pending',  className: 'text-warning' },
  paid:             { label: 'To ship',          className: 'text-warning' },
  shipped:          { label: 'To receive',       className: 'text-warning' },
  out_for_delivery: { label: 'Out for delivery', className: 'text-info' },
  delivered:        { label: 'Delivered',        className: 'text-success' },
  completed:        { label: 'Completed',        className: 'text-success' },
  cancelled:        { label: 'Cancelled',        className: 'text-danger' },
}

type SheetState =
  | { kind: 'details'; order: OrderHistoryRow }
  | { kind: 'review'; order: OrderHistoryRow; rating: number }
  | null

export default function OrderTracking({ customerName }: { customerName: string }) {
  const [orders, setOrders] = useState<OrderHistoryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('all')
  const [sheet, setSheet] = useState<SheetState>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/orders?pageSize=50')
      const json = await res.json()
      if (!json.success) { setError(json.message ?? 'Failed to load orders'); return }
      setOrders(json.data.rows as OrderHistoryRow[])
    } catch {
      setError('Failed to load orders')
    }
  }
  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    if (!orders) return []
    const def = TABS.find((t) => t.key === tab)
    if (!def || def.statuses === null) return orders
    const set = new Set(def.statuses)
    return orders.filter((o) => set.has(o.order_status))
  }, [orders, tab])

  const markRated = (orderId: number, rating: number) =>
    setOrders((prev) => prev?.map((o) => (o.order_id === orderId ? { ...o, my_rating: rating, can_review: false } : o)) ?? prev)

  return (
    <div className="rounded-xl border bg-white p-4 shadow-xs sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
        <Package className="h-4 w-4" /> Orders
      </h3>

      {/* Tabs */}
      <div className="-mx-1 mb-1 overflow-x-auto border-b border-border px-1">
        <div className="flex w-max gap-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 pb-2.5 text-sm transition-colors ${
                tab === t.key ? 'border-brand font-semibold text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-danger">{error}</p>
      ) : orders === null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <Package className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No orders here yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((o) => {
            const status = CARD_STATUS[o.order_status] ?? { label: o.order_status, className: 'text-muted-foreground' }
            const item = o.primary_item
            return (
              <li key={o.order_id} className="py-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: 'details', order: o })}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    View Details
                  </button>
                </div>

                <div className="mt-3 flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image src={item?.image_url ?? PLACEHOLDER} alt={item?.product_name ?? 'Order'} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">
                      {item?.product_name ?? `Order #${o.public_ref.slice(0, 8).toUpperCase()}`}
                    </p>
                    {item?.variant_label && <p className="mt-0.5 text-xs text-muted-foreground">{item.variant_label}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="text-muted-foreground">x{item?.quantity ?? o.total_qty}</span>
                      <span className="font-semibold">{money(item?.unit_price ?? o.total_amount)}</span>
                      {item?.original_price != null && (
                        <span className="text-xs text-muted-foreground line-through">{money(item.original_price)}</span>
                      )}
                      {item?.discount_percent != null && (
                        <span className="rounded bg-discount px-1.5 py-0.5 text-xs font-medium text-brand">-{item.discount_percent}%</span>
                      )}
                    </div>
                    {o.item_count > 1 && <p className="mt-1 text-xs text-muted-foreground">+{o.item_count - 1} more</p>}
                  </div>
                </div>

                {(o.delivered_at || o.expected_delivery) && (
                  <div className="mt-3 flex">
                    {o.delivered_at ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-success-tint px-3 py-1.5 text-xs font-medium text-success">
                        <CheckCircle2 size={14} /> Delivered on {fmtDate(o.delivered_at)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-tint px-3 py-1.5 text-xs font-medium text-brand">
                        <Truck size={14} /> Expected delivery: {fmtDate(o.expected_delivery)}
                      </span>
                    )}
                  </div>
                )}

                {o.delivered_at && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Tip: keep a short video of the item as you received it — it&apos;s needed to assess any return or refund.
                  </p>
                )}

                {o.my_rating != null ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    Your rating:
                    <span className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={15} className={o.my_rating! >= s ? 'fill-warning text-warning' : 'text-muted-foreground'} />
                      ))}
                    </span>
                  </div>
                ) : o.can_review && item?.product_id != null ? (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rate this item:</span>
                    <span className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" onClick={() => setSheet({ kind: 'review', order: o, rating: s })} aria-label={`Rate ${s}`}>
                          <Star size={18} className="text-muted-foreground hover:fill-warning hover:text-warning" />
                        </button>
                      ))}
                    </span>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {/* Sheets */}
      {sheet?.kind === 'details' && (
        <OrderDetailSheet
          order={sheet.order}
          customerName={customerName}
          onClose={() => setSheet(null)}
          onCancelled={() => { setSheet(null); load() }}
        />
      )}
      {sheet?.kind === 'review' && sheet.order.primary_item?.product_id != null && (
        <OrderReviewSheet
          order={sheet.order}
          initialRating={sheet.rating}
          onClose={() => setSheet(null)}
          onSubmitted={(rating) => { markRated(sheet.order.order_id, rating); setSheet(null) }}
        />
      )}
    </div>
  )
}
