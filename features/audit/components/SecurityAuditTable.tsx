'use client'

import React, { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SECURITY_EVENT_LABEL } from '@/features/audit/api/audit-config'
import type { SecurityAuditLog } from '@/shared/types/audit'

const str = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

function EventBadge({ type }: { type: SecurityAuditLog['event_type'] }) {
  const cls =
    type === 'login_failed'
      ? 'bg-danger-tint text-danger'
      : 'bg-warning-tint text-warning'
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {SECURITY_EVENT_LABEL[type] ?? type}
    </span>
  )
}

type Column = { header: string; cell: (r: SecurityAuditLog) => React.ReactNode }

const COLUMNS: Column[] = [
  { header: 'Timestamp', cell: (r) => fmtDateTime(r.created_at) },
  { header: 'Event',     cell: (r) => <EventBadge type={r.event_type} /> },
  { header: 'Account',   cell: (r) => str(r.email) },
  { header: 'IP address', cell: (r) => str(r.ip_address) },
  { header: 'Route',     cell: (r) => <code className="text-xs">{str(r.route)}</code> },
  {
    header: 'User ID',
    // Truncated for scanability; the full id is in the expanded row.
    cell: (r) => (r.user_id ? <code className="text-xs">{r.user_id.slice(0, 8)}…</code> : '—'),
  },
]

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted px-3 py-2 text-xs text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

// Read-only viewer for the append-only security_audit_logs table: expandable
// rows, URL-driven pagination, no edit affordances of any kind (the table
// rejects UPDATE/DELETE at the database level).
export default function SecurityAuditTable({
  rows,
  total,
  page,
  pageSize,
  totalPages,
}: {
  rows: SecurityAuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<number | null>(null)

  const colCount = COLUMNS.length + 1 // + expand toggle

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next <= 1) params.delete('page')
    else params.set('page', String(next))
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted text-left text-xs font-semibold text-muted-foreground">
              <th className="w-8 px-3 py-3" />
              {COLUMNS.map((c) => (
                <th key={c.header} className="px-5 py-3">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-16 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No security events</p>
                  <p className="text-xs text-muted-foreground">No events match the current filters.</p>
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const open = expanded === r.id
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      onClick={() => setExpanded(open ? null : r.id)}
                    >
                      <td className="px-3 py-3 text-muted-foreground">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      {COLUMNS.map((c, i) => (
                        <td key={i} className="px-5 py-3">{c.cell(r)}</td>
                      ))}
                    </tr>
                    {open && (
                      <tr className="border-b last:border-0 bg-muted/20">
                        <td colSpan={colCount} className="px-5 py-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div><span className="font-semibold text-foreground">Event:</span> {SECURITY_EVENT_LABEL[r.event_type] ?? r.event_type}</div>
                              <div><span className="font-semibold text-foreground">Account:</span> {str(r.email)}</div>
                              <div><span className="font-semibold text-foreground">User ID:</span> {str(r.user_id)}</div>
                              <div><span className="font-semibold text-foreground">IP:</span> {str(r.ip_address)}</div>
                              <div><span className="font-semibold text-foreground">Route:</span> {str(r.route)}</div>
                              <div className="break-all"><span className="font-semibold text-foreground">User agent:</span> {str(r.user_agent)}</div>
                              <div><span className="font-semibold text-foreground">When:</span> {fmtDateTime(r.created_at)}</div>
                            </div>
                            <JsonBlock label="Details" value={r.details} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <span>Page {page} of {Math.max(1, totalPages)}</span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
