'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AuditCategory } from '@/shared/types/audit'

// Filter bar for an audit category. Owns the date range, action type, and actor
// email search. Applying pushes the values into the URL searchParams, which
// re-runs the Server Component (SSR stays the source of truth).
export default function AuditFilters({
  category,
  actionOptions,
}: {
  category: AuditCategory
  actionOptions: { value: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [from, setFrom]   = useState(searchParams.get('from') ?? '')
  const [to, setTo]       = useState(searchParams.get('to') ?? '')
  const [action, setAction] = useState(searchParams.get('action') ?? '')
  const [email, setEmail] = useState(searchParams.get('actor_email') ?? '')

  // Keep inputs in sync if the URL changes elsewhere (e.g. switching categories).
  useEffect(() => {
    setFrom(searchParams.get('from') ?? '')
    setTo(searchParams.get('to') ?? '')
    setAction(searchParams.get('action') ?? '')
    setEmail(searchParams.get('actor_email') ?? '')
  }, [searchParams])

  const push = (params: URLSearchParams) => {
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const apply = () => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (action) params.set('action', action)
    if (email.trim()) params.set('actor_email', email.trim())
    push(params) // resets pagination (no `page` param)
  }

  const clear = () => {
    setFrom(''); setTo(''); setAction(''); setEmail('')
    push(new URLSearchParams())
  }

  const inputCls = 'px-3 py-2 text-sm rounded-xl border border-border bg-white'

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        From
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        To
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
      </label>

      {actionOptions.length > 0 && (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
            <option value="">All actions</option>
            {actionOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Actor email
        <input
          type="search"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="name@example.com"
          className={`${inputCls} min-w-[200px]`}
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
