'use client'

import { useState } from 'react'
import { customToast } from '@/shared/components/common/modals/ToastCustom'

type Customer = {
  user_id: string
  email: string | null
  name: string
  cardNumber: string | null
  verified: boolean
}

// Flow D: admin searches a customer by email, enters their physical card ID, and
// saves to make them a Verified Cardholder (has_perks on).
export default function VerifyCardholder() {
  const [email, setEmail] = useState('')
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined) // undefined = not searched yet
  const [cardId, setCardId] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async () => {
    if (!email.trim() || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/loyalty/customer?email=${encodeURIComponent(email.trim())}`)
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        customToast.error({ title: 'Search failed', description: payload.message ?? 'Please try again.' })
        return
      }
      setCustomer(payload.data as Customer | null)
      setCardId((payload.data as Customer | null)?.cardNumber ?? '')
    } catch {
      customToast.error({ title: 'Search failed', description: 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  const link = async () => {
    if (!customer || !cardId.trim() || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/loyalty-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: customer.user_id, cardNumber: cardId.trim() }),
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        customToast.error({ title: 'Could not link card', description: payload.message ?? 'Please try again.' })
        return
      }
      customToast.success({ title: 'Verified Cardholder', description: payload.message })
      await search()
    } catch {
      customToast.error({ title: 'Could not link card', description: 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  const revoke = async () => {
    if (!customer || busy) return
    setBusy(true)
    try {
      await fetch('/api/admin/loyalty-card', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: customer.user_id }),
      })
      customToast.success({ title: 'Cardholder status revoked' })
      await search()
    } catch {
      customToast.error({ title: 'Could not revoke', description: 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-hidden focus:border-ring focus:ring-2 focus:ring-ring'

  return (
    <div className="mb-8 rounded-xl border border-border bg-white p-5">
      <h2 className="text-sm font-semibold">Link a physical card</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Search a customer by email, enter their physical card ID, and save to make them a Verified Cardholder.
      </p>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="customer@email.com"
          className={inputCls}
        />
        <button
          type="button"
          onClick={search}
          disabled={busy || !email.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {customer === null && (
        <p className="mt-3 text-sm text-danger">No customer found with that email.</p>
      )}

      {customer && (
        <div className="mt-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{customer.name}</p>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
            </div>
            {customer.verified && (
              <span className="shrink-0 rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-medium text-success">
                Verified Cardholder
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              placeholder="Physical card ID"
              className={`${inputCls} font-mono text-[13px]`}
            />
            <button
              type="button"
              onClick={link}
              disabled={busy || !cardId.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {customer.verified ? 'Update card' : 'Link & verify'}
            </button>
            {customer.verified && (
              <button
                type="button"
                onClick={revoke}
                disabled={busy}
                className="rounded-lg border border-danger/40 px-4 py-2 text-[13px] font-medium text-danger hover:bg-danger-tint disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
