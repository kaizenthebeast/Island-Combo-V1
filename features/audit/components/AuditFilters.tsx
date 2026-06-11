'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AUDIT_TYPE_OPTIONS,
  ACTION_OPTIONS,
  ACTION_OPTION_GROUPS,
  isAuditCategory,
} from '@/features/audit/api/audit-config'

// Filter bar for the unified audit log. Owns the type, date range, action, and
// actor-email search. Applying pushes the values into the URL searchParams,
// which re-runs the Server Component (SSR stays the source of truth).
//
// The URL is the source of truth: inputs initialise from searchParams, and the
// parent remounts this component (via a key built from the active filters)
// whenever the URL changes, so no effect is needed to re-sync.
export default function AuditFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [type, setType]   = useState(searchParams.get('type') ?? '')
  const [from, setFrom]   = useState(searchParams.get('from') ?? '')
  const [to, setTo]       = useState(searchParams.get('to') ?? '')
  const [action, setAction] = useState(searchParams.get('action') ?? '')
  const [email, setEmail] = useState(searchParams.get('actor_email') ?? '')

  // Action choices follow the selected type: one category's actions when a type
  // is chosen, every action (grouped) when viewing all types.
  const typedActions =
    type && isAuditCategory(type) ? ACTION_OPTIONS[type] : null

  const push = (params: URLSearchParams) => {
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const apply = () => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (action) params.set('action', action)
    if (email.trim()) params.set('actor_email', email.trim())
    push(params) // resets pagination (no `page` param)
  }

  const clear = () => {
    setType(''); setFrom(''); setTo(''); setAction(''); setEmail('')
    push(new URLSearchParams())
  }

  // Switching type clears an action that no longer belongs to it.
  const onTypeChange = (next: string) => {
    setType(next)
    setAction('')
  }

  const inputCls = 'px-3 py-2 text-sm rounded-xl border border-border bg-white'

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type
        <select value={type} onChange={(e) => onTypeChange(e.target.value)} className={inputCls}>
          {AUDIT_TYPE_OPTIONS.map((o) => (
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
        Action
        <select value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
          <option value="">All actions</option>
          {typedActions
            ? typedActions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            : ACTION_OPTION_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
        </select>
      </label>

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
