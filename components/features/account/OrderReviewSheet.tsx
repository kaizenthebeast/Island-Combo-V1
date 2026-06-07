'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { ArrowLeft, CheckCircle2, Star, ImagePlus, X, Video } from 'lucide-react'
import { addProductReview } from '@/lib/reviews/review'
import { uploadReviewMedia } from '@/lib/reviews/review-upload'
import { customToast } from '@/components/shared/modals/ToastCustom'
import type { OrderHistoryRow } from '@/lib/types/order'

const PLACEHOLDER = '/images/placeholder.png'
const MAX_FILES = 6
const money = (n: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

export default function OrderReviewSheet({
  order, initialRating, onClose, onSubmitted,
}: {
  order: OrderHistoryRow
  initialRating: number
  onClose: () => void
  onSubmitted: (rating: number) => void
}) {
  const item = order.primary_item
  const [rating, setRating] = useState(initialRating)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()

  const previews = useMemo(
    () => files.map((f) => ({ url: URL.createObjectURL(f), isVideo: f.type.startsWith('video') })),
    [files],
  )
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const submit = () => {
    if (rating < 1 || !item?.product_id) return
    start(async () => {
      // 1) upload media to storage → paths, 2) save the review with those paths.
      let mediaPaths: string[] = []
      try {
        mediaPaths = files.length ? await uploadReviewMedia(files) : []
      } catch (e) {
        customToast.error({ title: 'Upload failed', description: e instanceof Error ? e.message : 'Could not upload your media.' })
        return
      }
      const res = await addProductReview({
        product_id: item.product_id!,
        order_id: order.order_id,
        rating,
        body: body.trim() || undefined,
        mediaPaths,
      })
      if (!res.success) { customToast.error({ title: "Couldn't submit review", description: res.message }); return }
      customToast.success({ title: 'Review submitted', description: 'Thanks for your feedback!' })
      onSubmitted(rating)
    })
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-md [&>button]:hidden">
        <SheetHeader className="flex-row items-center gap-3 border-b p-4">
          <button onClick={onClose} aria-label="Back" className="text-foreground hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <SheetTitle className="flex-1 text-center text-base font-bold">Write a review</SheetTitle>
          <span className="w-5" />
          <VisuallyHidden><SheetDescription>Rate and review your purchase</SheetDescription></VisuallyHidden>
        </SheetHeader>

        <div className="flex-1 space-y-5 p-5">
          {/* product summary */}
          <div className="flex gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image src={item?.image_url ?? PLACEHOLDER} alt={item?.product_name ?? 'Item'} fill className="object-cover" sizes="80px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-foreground">{item?.product_name}</p>
              {item?.variant_label && <p className="mt-0.5 text-xs text-muted-foreground">{item.variant_label}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-semibold">{money(item?.unit_price ?? null)}</span>
                {item?.original_price != null && <span className="text-xs text-muted-foreground line-through">{money(item.original_price)}</span>}
                {item?.discount_percent != null && <span className="rounded bg-discount px-1.5 py-0.5 text-xs font-medium text-brand">-{item.discount_percent}%</span>}
              </div>
            </div>
          </div>

          {order.delivered_at && (
            <div className="flex items-center gap-2 rounded-md bg-success-tint px-3 py-2 text-sm font-medium text-success">
              <CheckCircle2 size={16} /> Delivered on {fmtDate(order.delivered_at)}
            </div>
          )}

          {/* rating */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Rate this item:</span>
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onMouseEnter={() => setHover(s)} onClick={() => setRating(s)} aria-label={`Rate ${s}`}>
                  <Star size={24} className={(hover || rating) >= s ? 'fill-warning text-warning' : 'text-muted-foreground'} />
                </button>
              ))}
            </div>
          </div>

          {/* comment */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="What do you think of the quality and appearance?"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />

          {/* video-on-receipt note */}
          <div className="flex gap-2 rounded-lg bg-info-tint px-3 py-2.5 text-xs text-info-text">
            <Video size={16} className="mt-0.5 shrink-0 text-info" />
            <p>
              Please record a short video of the item <strong>as you receive / unbox it</strong>. It&apos;s the
              clearest proof of condition and is required to assess any <strong>return or refund</strong>.
            </p>
          </div>

          {/* photo/video upload */}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPick} />
            <div className="flex flex-wrap gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted">
                  {p.isVideo ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Video size={18} className="text-muted-foreground" />
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    aria-label="Remove"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {files.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-[10px] font-medium text-muted-foreground hover:border-brand hover:text-brand"
                >
                  <ImagePlus size={16} /> Photo/Video
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Up to {MAX_FILES} files · photos or short videos.</p>
          </div>
        </div>

        <div className="border-t p-4">
          <button
            type="button"
            onClick={submit}
            disabled={pending || rating < 1}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {pending ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
