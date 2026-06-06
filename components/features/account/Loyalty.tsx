'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Info, CircleDollarSign, ShoppingBag, Infinity as InfinityIcon, BadgePercent,
  CalendarClock, Percent, Wallet,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { customToast } from '@/components/shared/modals/ToastCustom'
import { pointsToCash } from '@/lib/cart/loyalty-config'
import type { LoyaltyHistoryEntry } from '@/lib/loyalty/history'

type Status = { points: number; cashValue: number; cardNumber: string | null; hasPerks: boolean }
type HistoryTab = 'all' | 'earned' | 'redeemed'

// e.g. "2 Feb 2026, 11:38 AM"
const formatDate = (iso: string) => {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date}, ${time}`
}

const entryTitle = (e: LoyaltyHistoryEntry) => {
  if (e.order_id) return `Order ID ${e.order_id}`
  if (e.reason === 'loyverse_import') return 'Imported from Island Combo'
  return e.kind === 'earned' ? 'Points earned' : 'Points redeemed'
}

const Loyalty = () => {
  const [status, setStatus] = useState<Status>({ points: 0, cashValue: 0, cardNumber: null, hasPerks: false })
  const [history, setHistory] = useState<LoyaltyHistoryEntry[]>([])
  const [view, setView] = useState<'main' | 'history'>('main')
  const [tab, setTab] = useState<HistoryTab>('all')
  const [retrieveOpen, setRetrieveOpen] = useState(false)
  const [card, setCard] = useState('')
  const [retrieving, setRetrieving] = useState(false)
  const [retrieveError, setRetrieveError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/loyalty')
      const payload = await res.json()
      if (res.ok && payload.success) setStatus(payload.data)
    } catch { /* non-fatal */ }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/loyalty/history')
      const payload = await res.json()
      if (res.ok && payload.success) setHistory(payload.data ?? [])
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { loadStatus(); loadHistory() }, [loadStatus, loadHistory])

  const handleRetrieve = async () => {
    if (!card.trim()) { setRetrieveError('Enter your loyalty card number.'); return }
    setRetrieving(true)
    setRetrieveError(null)
    try {
      const res = await fetch('/api/loyalty/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: card.trim() }),
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        setRetrieveError(payload.message ?? 'Could not link your loyalty card.')
        return
      }
      await Promise.all([loadStatus(), loadHistory()])
      setRetrieveOpen(false)
      setCard('')
      customToast.success({ title: 'Loyalty card linked', description: 'Your in-store points will sync to your balance.' })
    } catch {
      setRetrieveError('Something went wrong. Please try again.')
    } finally {
      setRetrieving(false)
    }
  }

  // Shared Retrieve sheet (used by the main view).
  const retrieveSheet = (
    <Sheet open={retrieveOpen} onOpenChange={setRetrieveOpen}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-center text-lg">Retrieve my Points</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 p-5">
          <div className="flex items-start gap-2 rounded-lg bg-surface-soft px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              If you are an existing customer, input your loyalty card number to retrieve your points.
            </p>
          </div>
          <div className="space-y-2">
            <Input
              value={card}
              onChange={(e) => { setCard(e.target.value); setRetrieveError(null) }}
              placeholder="Loyalty card number *"
              className="h-12"
              autoComplete="off"
            />
            {retrieveError && <p className="text-xs text-danger">{retrieveError}</p>}
          </div>
          <button
            type="button"
            onClick={handleRetrieve}
            disabled={retrieving}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {retrieving ? 'Retrieving…' : 'Retrieve my points'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )

  // ── HISTORY VIEW ──────────────────────────────────────────────────────────
  if (view === 'history') {
    const filtered = history.filter((e) => tab === 'all' || e.kind === tab)
    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        <nav className="text-lg font-bold">
          <button type="button" onClick={() => setView('main')} className="text-muted-foreground hover:underline">
            Loyalty Points
          </button>
          <span className="px-2 text-muted-foreground">&gt;</span>
          <span className="text-brand">History</span>
        </nav>

        {/* Tabs */}
        <div className="flex gap-3">
          {(['all', 'earned', 'redeemed'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-brand bg-brand-tint text-brand'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No {tab === 'all' ? '' : tab} transactions yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{entryTitle(e)}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.kind === 'redeemed' ? `Redeemed on ${formatDate(e.created_at)}` : formatDate(e.created_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${e.points >= 0 ? 'text-success' : 'text-danger'}`}>
                    {e.points >= 0 ? '+' : ''}{e.points.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">≈ ${pointsToCash(Math.abs(e.points)).toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-foreground">Loyalty Points</h2>

      {/* Retrieve banner */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-soft px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          If you are an existing customer, retrieve your points by inputting your loyalty card number.{' '}
          <button
            type="button"
            onClick={() => { setRetrieveError(null); setRetrieveOpen(true) }}
            className="font-semibold text-brand hover:underline"
          >
            Retrieve my points.
          </button>
        </p>
      </div>

      {/* Balance card */}
      <div className="flex items-center justify-between rounded-xl bg-warning-tint px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/70 p-2">
            <CircleDollarSign className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-medium text-brand">Loyalty Points</p>
            <p className="text-xl font-bold text-brand">
              {status.points.toLocaleString()} ≈ ${status.cashValue.toFixed(2)}
            </p>
            {status.cardNumber && (
              <p className="mt-0.5 text-xs text-brand/70">Card no. {status.cardNumber}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setView('history')}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted"
        >
          View history
        </button>
      </div>

      {/* Benefits & Perks */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h3 className="mb-4 text-base font-bold">Benefits &amp; Perks</h3>
        <ul className="space-y-4">
          <Perk icon={ShoppingBag} title="Earn points on every purchase">
            All points earned can be redeemed as cash value at Island Combo stores only.
          </Perk>
          <Perk icon={InfinityIcon} title="Points never expire">
            Your points stay with you—use them anytime.
          </Perk>
          <Perk icon={BadgePercent} title="Exclusive loyalty-only deals">
            Get access to special offers like:
            <ul className="mt-1 list-disc pl-5">
              <li>Up to 50% OFF storewide</li>
              <li>Flash deals such as &quot;All footwear for $1&quot; (members only)</li>
            </ul>
          </Perk>
          <Perk icon={CalendarClock} title="Early access to promos &amp; events">
            Be the first to enjoy selected sales, promotions, and in-store events.
          </Perk>
        </ul>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h3 className="mb-4 text-base font-bold">How it works</h3>
        <ul className="space-y-4">
          <Perk icon={Percent} tint="brand" title="Earn 1% back on every purchase">
            For every $20 spent, you earn $0.20 in loyalty points.
          </Perk>
          <Perk icon={Wallet} tint="brand" title="Redeem anytime at checkout">
            Use your points as:
            <ul className="mt-1 list-disc pl-5">
              <li>Partial payment, or</li>
              <li>Full payment, depending on your available balance.</li>
            </ul>
          </Perk>
        </ul>
      </div>

      <div className="flex justify-center pt-2">
        <Link
          href="/"
          className="rounded-full border border-brand px-8 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
        >
          Earn loyalty points now!
        </Link>
      </div>

      {retrieveSheet}
    </div>
  )
}

// Small benefit/how-it-works row with a tinted icon.
function Perk({
  icon: Icon, title, tint = 'success', children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  tint?: 'success' | 'brand'
  children: React.ReactNode
}) {
  const tintClass = tint === 'brand' ? 'bg-brand-tint text-brand' : 'bg-success-tint text-success'
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tintClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <div className="text-xs text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

export default Loyalty
