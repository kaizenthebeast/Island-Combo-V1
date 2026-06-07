'use client'

import { useState, useTransition } from 'react'
import { Search, User, Star, Package, Ticket, Plus, Minus, AlertCircle, BadgeCheck, RotateCcw } from 'lucide-react'
import {
  searchCustomers, getCustomerProfile, adjustLoyaltyPoints,
  type AdminCustomer, type AdminCustomerProfile,
} from '@/lib/admin/loyalty'

const money = (n: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// Search a member, view their consolidated profile (balance, orders, vouchers),
// and adjust their loyalty points.
export default function MembersPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminCustomer[] | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searching, startSearch] = useTransition()

  const [profile, setProfile] = useState<AdminCustomerProfile | null>(null)
  const [loadingProfile, startProfile] = useTransition()

  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [adjusting, startAdjust] = useTransition()
  const [adjustMsg, setAdjustMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearchError(null)
    setProfile(null)
    startSearch(async () => {
      const res = await searchCustomers(query)
      if (!res.success) { setSearchError(res.message); setResults([]); return }
      setResults(res.customers)
    })
  }

  const openProfile = (userId: string) => {
    setAdjustMsg(null); setDelta(''); setReason('')
    startProfile(async () => {
      const res = await getCustomerProfile(userId)
      if (!res.success) { setSearchError(res.message); return }
      setProfile(res.profile)
    })
  }

  const handleAdjust = (sign: 1 | -1) => {
    if (!profile) return
    const magnitude = Math.abs(Math.trunc(Number(delta)))
    if (!magnitude || !reason.trim()) {
      setAdjustMsg({ ok: false, text: 'Enter a point amount and a reason.' })
      return
    }
    setAdjustMsg(null)
    startAdjust(async () => {
      const res = await adjustLoyaltyPoints(profile.user_id, sign * magnitude, reason)
      setAdjustMsg({ ok: res.success, text: res.message })
      if (res.success) {
        setDelta(''); setReason('')
        const refreshed = await getCustomerProfile(profile.user_id)
        if (refreshed.success) setProfile(refreshed.profile)
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <label htmlFor="member-q" className="text-sm font-semibold text-foreground">Find a member</label>
        <p className="mt-0.5 text-xs text-muted-foreground">Search by email, name, or loyalty card number.</p>
        <div className="mt-3 flex gap-2">
          <input
            id="member-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="email, name, or card number"
            className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button type="submit" disabled={searching || !query.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            <Search size={15} />{searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-tint px-3 py-2">
            <AlertCircle size={15} className="text-danger" />
            <p className="text-xs font-medium text-danger">{searchError}</p>
          </div>
        )}

        {results && !profile && (
          <ul className="mt-4 divide-y divide-border">
            {results.length === 0 && <li className="py-3 text-sm text-muted-foreground">No members found.</li>}
            {results.map((c) => (
              <li key={c.user_id}>
                <button onClick={() => openProfile(c.user_id)}
                  className="flex w-full items-center justify-between py-3 text-left hover:opacity-80">
                  <span className="flex items-center gap-2">
                    <User size={15} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.email}</span>
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{c.cardNumber ?? 'no card'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {loadingProfile && <p className="text-center text-sm text-muted-foreground">Loading profile…</p>}

      {/* Consolidated profile */}
      {profile && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {profile.phone ?? 'no phone'} · member since {fmtDate(profile.memberSince)}
                {profile.cardNumber && <> · card <span className="font-mono">{profile.cardNumber}</span>{profile.verified && ' ✓'}</>}
              </p>
            </div>
            <button onClick={() => { setProfile(null); setAdjustMsg(null) }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <RotateCcw size={13} /> Back to results
            </button>
          </div>

          {/* Loyalty balance + adjust */}
          <div className="mt-5 rounded-xl bg-brand-tint px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-brand"><Star size={15} /> Loyalty balance</span>
              <span className="text-2xl font-extrabold text-brand">{profile.pointsBalance.toLocaleString()} pts</span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
              <input type="number" min={1} value={delta} onChange={(e) => setDelta(e.target.value)}
                placeholder="points" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (required, audited)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => handleAdjust(1)} disabled={adjusting}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                <Plus size={15} /> Add
              </button>
              <button onClick={() => handleAdjust(-1)} disabled={adjusting}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                <Minus size={15} /> Deduct
              </button>
            </div>
            {adjustMsg && (
              <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 ${adjustMsg.ok ? 'bg-success-tint' : 'bg-danger-tint'}`}>
                {adjustMsg.ok ? <BadgeCheck size={15} className="text-success" /> : <AlertCircle size={15} className="text-danger" />}
                <p className={`text-xs font-medium ${adjustMsg.ok ? 'text-success-text' : 'text-danger'}`}>{adjustMsg.text}</p>
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="mt-6">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Package size={15} /> Order history ({profile.orders.length})</h3>
            <ul className="mt-2 divide-y divide-border text-sm">
              {profile.orders.length === 0 && <li className="py-2 text-muted-foreground">No orders.</li>}
              {profile.orders.map((o) => (
                <li key={o.order_id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs text-muted-foreground">{o.public_ref.slice(0, 8)}</span>
                  <span className="text-xs capitalize">{o.order_status.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</span>
                  <span className="font-medium">{money(o.total_amount)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vouchers */}
          <div className="mt-6">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Ticket size={15} /> Voucher history ({profile.vouchers.length})</h3>
            <ul className="mt-2 divide-y divide-border text-sm">
              {profile.vouchers.length === 0 && <li className="py-2 text-muted-foreground">No vouchers.</li>}
              {profile.vouchers.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs">{v.code}</span>
                  <span className="text-xs capitalize">{v.status.toLowerCase()}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(v.created_at)}</span>
                  <span className="font-medium">{money(v.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
