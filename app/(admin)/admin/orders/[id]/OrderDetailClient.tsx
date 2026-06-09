'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import StatusBadge from '@/shared/components/admin/StatusBadge'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import {
  ORDER_STATUSES,
  orderStatusLabel,
  orderStatusVariant,
} from '@/features/orders/api/order-status'
import type { AdminOrderDetail, OrderStatus } from '@/shared/types/order'
import type { TransactionEvent } from '@/shared/types/transaction-event'

const money = (n: number | null | undefined) => `$${Number(n ?? 0).toFixed(2)}`
const paymentLabel = (m: string) => (m === 'cod' ? 'COD (Cash on Delivery)' : m === 'card' ? 'PayPal' : m)
const dateTime = (s: string) => new Date(s).toLocaleString()

interface Props {
  detail: AdminOrderDetail
  timeline: TransactionEvent[]
}

export default function OrderDetailClient({ detail, timeline }: Props) {
  const router = useRouter()
  const { order, customer, items } = detail

  const [status, setStatus] = useState<OrderStatus>(order.order_status)
  const [notes, setNotes] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const subtotal = items.reduce((sum, i) => sum + Number(i.line_total ?? 0), 0)

  const handleUpdate = async () => {
    if (!password.trim()) {
      customToast.error({
        title: 'Password required',
        description: 'Enter your password to confirm the status change.',
      })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.order_id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, delivery_notes: notes || null, password }),
      })
      const result = await res.json()

      if (!result?.success) {
        customToast.error({
          title: "Couldn't update order",
          description: result?.message ?? 'Something went wrong updating the status.',
        })
        return
      }

      setNotes('')
      setPassword('')
      customToast.success({
        title: 'Order updated',
        description: `Status set to “${orderStatusLabel(status)}”.`,
      })
      router.refresh()
    } catch (e) {
      customToast.error({
        title: 'An error occurred',
        description: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const isTerminalPaid = status === 'delivered' || status === 'completed'

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Order #{order.order_id}</h1>
          <StatusBadge status={orderStatusLabel(order.order_status)} variant={orderStatusVariant(order.order_status)} />
        </div>
        <p className="text-sm text-muted-foreground">Placed {dateTime(order.created_at)}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: items + timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line items */}
          <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
            <h3 className="px-5 py-4 border-b font-bold">Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b text-left">
                  <th className="px-5 py-2.5 font-semibold">Product</th>
                  <th className="px-5 py-2.5 font-semibold">SKU</th>
                  <th className="px-5 py-2.5 font-semibold text-center">Qty</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Price</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-5 py-3">{it.product_name ?? `Variant ${it.variant_id ?? '—'}`}</td>
                    <td className="px-5 py-3 text-muted-foreground">{it.sku ?? '—'}</td>
                    <td className="px-5 py-3 text-center">{it.quantity}</td>
                    <td className="px-5 py-3 text-right">{money(it.price)}</td>
                    <td className="px-5 py-3 text-right">{money(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-5 py-4 border-t space-y-1 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="Shipping" value={money(order.shipping_fee)} />
              {Number(order.discount_amount ?? 0) > 0 && (
                <Row label={`Discount${order.promo_code ? ` (${order.promo_code})` : ''}`} value={`- ${money(order.discount_amount)}`} />
              )}
              <div className="flex justify-between pt-1 font-bold text-base">
                <span>Total</span>
                <span>{money(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border rounded-xl shadow-xs p-5">
            <h3 className="font-bold mb-4">Order timeline</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ol className="relative border-l border-border ml-2">
                {timeline.map((ev) => (
                  <li key={ev.id} className="mb-5 ml-4">
                    <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-brand" />
                    <div className="flex items-center gap-2">
                      <StatusBadge status={orderStatusLabel(ev.status)} variant={orderStatusVariant(ev.status)} />
                      <span className="text-xs text-muted-foreground">{dateTime(ev.created_at)}</span>
                    </div>
                    {ev.note && <p className="mt-1 text-sm">{ev.note}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ev.actor_name ? `by ${ev.actor_name} · ` : ''}via {ev.source}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Right: customer + status tool */}
        <div className="space-y-6">
          {/* Customer / shipping */}
          <div className="bg-white border rounded-xl shadow-xs p-5 text-sm space-y-3">
            <h3 className="font-bold">Customer</h3>
            <div className="text-muted-foreground space-y-1">
              <p className="text-foreground font-medium">{customer.name ?? '—'}</p>
              <p>{customer.email ?? '—'}</p>
              <p>{order.phone_number}</p>
            </div>
            <div>
              <h4 className="font-semibold mt-2">Shipping address</h4>
              <p className="text-muted-foreground mt-1">{order.shipping_address}</p>
            </div>
            <div>
              <h4 className="font-semibold mt-2">Payment</h4>
              <p className="text-muted-foreground mt-1">{paymentLabel(order.payment_method)}</p>
              {order.paypal_capture_id && (
                <p className="text-xs text-muted-foreground mt-1 break-all">
                  PayPal capture: {order.paypal_capture_id}
                </p>
              )}
            </div>
          </div>

          {/* Status update tool */}
          <div className="bg-white border rounded-xl shadow-xs p-5 space-y-3">
            <h3 className="font-bold">Update status</h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground">New status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{orderStatusLabel(s)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Delivery notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Handed to APA courier; tracking #…"
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border resize-none"
              />
            </div>

            {isTerminalPaid && (
              <p className="text-xs text-success">
                Marking as “{orderStatusLabel(status)}” will accrue loyalty points to the customer.
              </p>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Confirm with your password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Your account password"
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Required to confirm it&apos;s you. This change is recorded against your account.
              </p>
            </div>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving || !password.trim()}
              className="w-full rounded-full bg-brand hover:bg-brand-hover text-white py-2.5 text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Updating…' : 'Update order'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
