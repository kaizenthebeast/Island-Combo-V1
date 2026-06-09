'use client'

import { useState, useTransition } from 'react'
import { Star, CheckCircle2, AlertCircle } from 'lucide-react'
import { addProductReview, type ReviewableProduct } from '@/features/reviews/api/review'

// Shown on a completed order: lets the buyer review each purchased product once.
export default function ReviewableProducts({ products }: { products: ReviewableProduct[] }) {
  const [remaining, setRemaining] = useState(products)
  if (remaining.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-sm font-semibold">Rate your purchase</h2>
      <p className="text-xs text-muted-foreground">Your order is complete — share a review of what you bought.</p>
      <div className="mt-4 space-y-3">
        {remaining.map((p) => (
          <ReviewForm
            key={p.product_id}
            product={p}
            onDone={() => setRemaining((r) => r.filter((x) => x.product_id !== p.product_id))}
          />
        ))}
      </div>
    </div>
  )
}

function ReviewForm({ product, onDone }: { product: ReviewableProduct; onDone: () => void }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  const submit = () => {
    if (rating < 1) { setError('Please pick a star rating.'); return }
    setError(null)
    start(async () => {
      const res = await addProductReview({
        product_id: product.product_id,
        order_id: product.order_id,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      })
      if (!res.success) { setError(res.message); return }
      setDone(true)
      setTimeout(onDone, 1400)
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-tint px-4 py-3">
        <CheckCircle2 size={16} className="text-success" />
        <p className="text-sm font-medium text-success-text">Thanks for reviewing {product.product_name}!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm font-medium text-foreground">{product.product_name}</p>

      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            aria-label={`${s} star${s > 1 ? 's' : ''}`}
          >
            <Star
              size={22}
              className={(hover || rating) >= s ? 'fill-warning text-warning' : 'text-muted-foreground'}
            />
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your experience (optional)"
        rows={3}
        className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
      />

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit review'}
      </button>
    </div>
  )
}
