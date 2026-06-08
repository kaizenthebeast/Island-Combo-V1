'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { ArrowLeft, Copy, Check, CheckCircle2, Circle, ImagePlus, X, Video } from 'lucide-react'
import { cancelMyOrder } from '@/lib/orders/orders'
import { uploadRefundMedia } from '@/lib/orders/refund-upload'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import type { OrderHistoryRow, CustomerOrderDetail } from '@/shared/types/order'

const TRACKED = new Set(['shipped', 'out_for_delivery', 'delivered', 'completed'])
const CANCELLABLE = new Set(['pending', 'paid'])

const CANCEL_REASONS = [
  'I changed my mind',
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Item no longer needed',
  'Delivery takes too long',
  'Other',
]

const paymentLabel = (m: string) => (m === 'card' ? 'Credit Card' : m === 'cod' ? 'Cash on Delivery' : m)
const orderNo = (publicRef: string) => publicRef.replace(/-/g, '').slice(0, 10).toUpperCase()

const EVENT_LABEL: Record<string, string> = {
  pending: 'Order is placed',
  paid: 'Payment received',
  shipped: 'Order is shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Order completed',
  cancelled: 'Order cancelled',
}
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand"
    >
      {value}
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-muted-foreground" />}
    </button>
  )
}

export default function OrderDetailSheet({
  order, customerName, onClose, onCancelled,
}: {
  order: OrderHistoryRow
  customerName: string
  onClose: () => void
  onCancelled: () => void
}) {
  const [detail, setDetail] = useState<CustomerOrderDetail | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [cancelling, startCancel] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [otherText, setOtherText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tracked = TRACKED.has(order.order_status)
  const cancellable = CANCELLABLE.has(order.order_status)
  const isPaid = order.order_status === 'paid'
  const canConfirm = reason !== '' && (reason !== 'Other' || otherText.trim() !== '')

  const previews = useMemo(
    () => files.map((f) => ({ url: URL.createObjectURL(f), isVideo: f.type.startsWith('video') })),
    [files],
  )
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 6))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  useEffect(() => {
    let active = true
    fetch(`/api/orders/${order.public_ref}`)
      .then((r) => r.json())
      .then((j) => { if (active) j.success ? setDetail(j.data) : setLoadErr(j.message ?? 'Could not load the order.') })
      .catch(() => active && setLoadErr('Could not load the order.'))
    return () => { active = false }
  }, [order.public_ref])

  const handleCancel = () => {
    const finalReason = reason === 'Other' ? otherText.trim() : reason
    if (!finalReason) return
    startCancel(async () => {
      // Paid orders → upload the evidence first, then raise the refund request.
      let mediaPaths: string[] = []
      if (isPaid && files.length) {
        try {
          mediaPaths = await uploadRefundMedia(files)
        } catch (e) {
          customToast.error({ title: 'Upload failed', description: e instanceof Error ? e.message : 'Could not upload your evidence.' })
          return
        }
      }
      const res = await cancelMyOrder(order.order_id, finalReason, mediaPaths)
      if (!res.success) { customToast.error({ title: "Couldn't cancel", description: res.message }); return }
      if (res.refundRequested) {
        customToast.success({
          title: 'Refund requested',
          description: 'Your refund request was submitted — our team will review it shortly.',
        })
      } else {
        customToast.success({ title: 'Order cancelled', description: 'Your order has been cancelled.' })
      }
      onCancelled()
    })
  }

  const events = [...(detail?.timeline ?? [])].reverse()
  const trackingNumber = detail?.fulfillment?.tracking_number ?? orderNo(order.public_ref)

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md [&>button]:hidden">
        <SheetHeader className="flex-row items-center gap-3 border-b p-4">
          <button onClick={onClose} aria-label="Back" className="text-foreground hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <SheetTitle className="flex-1 text-center text-base font-bold">
            {tracked ? 'Order Tracking' : 'Details'}
          </SheetTitle>
          <span className="w-5" />
          <VisuallyHidden><SheetDescription>Order details and tracking</SheetDescription></VisuallyHidden>
        </SheetHeader>

        {loadErr ? (
          <p className="p-6 text-sm text-danger">{loadErr}</p>
        ) : !detail ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-5 p-5">
            {order.order_status === 'paid' && !tracked && (
              <p className="text-sm font-medium text-warning">Waiting for seller to ship</p>
            )}

            {/* Tracking timeline */}
            {tracked && (
              <section>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracking number</span>
                  <CopyField value={trackingNumber} />
                </div>
                <ol className="mt-4 space-y-4">
                  {events.length === 0 && <li className="text-sm text-muted-foreground">No tracking updates yet.</li>}
                  {events.map((ev, i) => (
                    <li key={ev.id} className="flex gap-3">
                      {i === 0
                        ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                        : <Circle size={16} className="mt-0.5 shrink-0 text-muted-foreground" />}
                      <div>
                        <p className={`text-sm ${i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {EVENT_LABEL[ev.status] ?? ev.status}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDateTime(ev.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Delivery details */}
            <section className="border-t pt-4">
              <h4 className="text-sm font-bold text-foreground">Delivery Details</h4>
              <div className="mt-2 text-sm">
                <p className="font-medium text-foreground">
                  {customerName || 'You'}
                  {detail.order.phone_number && <span className="ml-2 text-xs text-muted-foreground">{detail.order.phone_number}</span>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{detail.order.shipping_address}</p>
              </div>
            </section>

            {/* Order details */}
            <section className="border-t pt-4">
              <h4 className="mb-2 text-sm font-bold text-foreground">Order Details</h4>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <CopyField value={orderNo(order.public_ref)} />
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-medium text-foreground">{paymentLabel(detail.order.payment_method)}</span>
              </div>
            </section>

            {cancellable && !cancelOpen && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="w-full rounded-full border border-brand py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
              >
                Cancel Order
              </button>
            )}

            {cancellable && cancelOpen && (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Why are you cancelling?</p>
                <div className="space-y-2">
                  {CANCEL_REASONS.map((r) => (
                    <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                      <input
                        type="radio"
                        name="cancel-reason"
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="h-4 w-4 accent-brand"
                      />
                      {r}
                    </label>
                  ))}
                </div>
                {reason === 'Other' && (
                  <textarea
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    rows={2}
                    placeholder="Tell us the reason"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                )}
                {isPaid && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      This order is paid — your request will be reviewed before the refund is issued.
                    </p>
                    <div>
                      <p className="text-xs font-medium text-foreground">Attach photos / video (recommended)</p>
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        Evidence of the item&apos;s condition (ideally your unboxing video) helps us approve your refund faster.
                      </p>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPick} />
                      <div className="flex flex-wrap gap-2">
                        {previews.map((p, i) => (
                          <div key={i} className="relative h-14 w-14 overflow-hidden rounded-md border border-border bg-muted">
                            {p.isVideo ? (
                              <div className="flex h-full w-full items-center justify-center"><Video size={16} className="text-muted-foreground" /></div>
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={p.url} alt="" className="h-full w-full object-cover" />
                            )}
                            <button type="button" onClick={() => removeFile(i)} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remove"><X size={10} /></button>
                          </div>
                        ))}
                        {files.length < 6 && (
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border text-[9px] font-medium text-muted-foreground hover:border-brand hover:text-brand">
                            <ImagePlus size={14} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setCancelOpen(false); setReason(''); setOtherText('') }}
                    className="flex-1 rounded-full border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    Keep order
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling || !canConfirm}
                    className="flex-1 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                  >
                    {cancelling ? 'Submitting…' : order.order_status === 'paid' ? 'Request Refund' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
