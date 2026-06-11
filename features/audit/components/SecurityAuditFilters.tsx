'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SECURITY_TYPE_OPTIONS } from '@/features/audit/api/audit-config'

// Filter bar for the security audit log: event type, date range, and a single
// search box covering email OR IP address. Same URL-as-source-of-truth pattern
// as AuditFilters — the parent remounts this via a key when the URL changes.
export default function SecurityAuditFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [event, setEvent]   = useState(searchParams.get('event') ?? '')
  const [from, setFrom]     = useState(searchParams.get('from') ?? '')
  const [to, setTo]         = useState(searchParams.get('to') ?? '')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const push = (params: URLSearchParams) => {
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const apply = () => {
    const params = new URLSearchParams()
    if (event) params.set('event', event)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (search.trim()) params.set('search', search.trim())
    push(params) // resets pagination (no `page` param)
  }

  const clear = () => {
    setEvent(''); setFrom(''); setTo(''); setSearch('')
    push(new URLSearchParams())
  }

  const inputCls = 'px-3 py-2 text-sm rounded-xl border border-border bg-white'

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Event
        <select value={event} onChange={(e) => setEvent(e.target.value)} className={inputCls}>
          {SECURITY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        From
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        To
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Email or IP
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="name@example.com or 203.0.113.7"
          className={`${inputCls} min-w-[220px]`}
        />
      </label>

      <button
        type="button"
        onClick={apply}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={clear}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        Clear
      </button>
    </div>
  )
}
