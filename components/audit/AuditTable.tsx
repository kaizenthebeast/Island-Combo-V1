'use client'

import React, { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AuditCategory, AuditLog } from '@/types/audit'

// ── value helpers ────────────────────────────────────────────────────────────
const get = (r: AuditLog, side: 'old' | 'new', key: string): unknown => {
  const obj = side === 'new' ? r.new_data : r.old_data
  return obj ? obj[key] : undefined
}
const str = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const money = (v: number | null) => (v === null || Number.isNaN(v) ? '—' : `$${v.toFixed(2)}`)

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

const diffStr = (r: AuditLog, key: string): string | null => {
  const o = get(r, 'old', key)
  const n = get(r, 'new', key)
  if (o === undefined && n === undefined) return null
  return `${str(o)} → ${str(n)}`
}

const subjectEmail = (r: AuditLog) =>
  str(get(r, 'new', 'email') ?? get(r, 'old', 'email') ?? r.actor_email)

const productLabel = (r: AuditLog) =>
  str(get(r, 'new', 'name') ?? get(r, 'new', 'sku') ?? get(r, 'old', 'name') ?? get(r, 'old', 'sku') ??
      (r.entity_id ? `#${r.entity_id}` : null))

const summarize = (r: AuditLog): string => {
  for (const k of ['order_status', 'status', 'role', 'stock', 'price']) {
    const d = diffStr(r, k)
    if (d) return d
  }
  return `${r.entity_type}${r.entity_id ? ` #${r.entity_id}` : ''}`
}

function ActionBadge({ action }: { action: string }) {
  const cls =
    action.endsWith('.created')   ? 'bg-success-tint text-success'
    : action.endsWith('.deleted') ? 'bg-danger-tint text-danger'
    : action.includes('role_changed') ? 'bg-warning-tint text-warning'
    : action.includes('status_changed') || action.includes('stock') || action.includes('price')
        ? 'bg-brand-tint text-brand'
    : 'bg-muted text-muted-foreground'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{action}</span>
}

// ── per-category columns ─────────────────────────────────────────────────────
type Column = { header: string; align?: 'left' | 'right' | 'center'; cell: (r: AuditLog) => React.ReactNode }

const columnsFor = (category: AuditCategory): Column[] => {
  switch (category) {
    case 'users':
      return [
        { header: 'Timestamp', cell: (r) => fmtDateTime(r.created_at) },
        { header: 'User',      cell: (r) => subjectEmail(r) },
        { header: 'Action',    cell: (r) => <ActionBadge action={r.action} /> },
        { header: 'IP address', cell: (r) => str(r.ip_address) },
        { header: 'Actor',     cell: (r) => str(r.actor_email ?? 'system') },
      ]
    case 'orders':
      return [
        { header: 'Timestamp', cell: (r) => fmtDateTime(r.created_at) },
        { header: 'Order',     cell: (r) => `#${str(r.entity_id)}` },
        { header: 'Action',    cell: (r) => <ActionBadge action={r.action} /> },
        { header: 'Old → New', cell: (r) => diffStr(r, 'order_status') ?? '—' },
        { header: 'Changed by', cell: (r) => str(r.actor_email ?? 'system') },
      ]
    case 'products':
      return [
        { header: 'Timestamp', cell: (r) => fmtDateTime(r.created_at) },
        { header: 'Product',   cell: (r) => productLabel(r) },
        { header: 'Action',    cell: (r) => <ActionBadge action={r.action} /> },
        { header: 'Old → New', cell: (r) => diffStr(r, 'stock') ?? diffStr(r, 'price') ?? '—' },
        { header: 'Changed by', cell: (r) => str(r.actor_email ?? 'system') },
      ]
    case 'payments':
      return [
        { header: 'Timestamp', cell: (r) => fmtDateTime(r.created_at) },
        { header: 'Order',     cell: (r) => `#${str(r.entity_id)}` },
        { header: 'Amount', align: 'right', cell: (r) => money(num(get(r, 'new', 'amount') ?? get(r, 'old', 'amount'))) },
        { header: 'Method',    cell: (r) => str(get(r, 'new', 'method') ?? get(r, 'old', 'method')) },
        { header: 'Status',    cell: (r) => <ActionBadge action={r.action} /> },
        { header: 'Ref',       cell: (r) => str(get(r, 'new', 'paypal_capture_id') ?? get(r, 'new', 'paypal_order_id')) },
      ]
    case 'admins':
      return [
        { header: 'Timestamp', cell: (r) => fmtDateTime(r.created_at) },
        { header: 'Admin',     cell: (r) => str(r.actor_email) },
        { header: 'Action',    cell: (r) => <ActionBadge action={r.action} /> },
        { header: 'Entity',    cell: (r) => `${r.entity_type}${r.entity_id ? ` #${r.entity_id}` : ''}` },
        { header: 'Details',   cell: (r) => summarize(r) },
      ]
  }
}

// ── detail (expanded row) ────────────────────────────────────────────────────
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

// ── table ────────────────────────────────────────────────────────────────────
export default function AuditTable({
  category,
  rows,
  total,
  page,
  pageSize,
  totalPages,
}: {
  category: AuditCategory
  rows: AuditLog[]
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

  const columns = columnsFor(category)
  const colCount = columns.length + 1 // + expand toggle

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
              {columns.map((c) => (
                <th key={c.header} className={`px-5 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-16 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No audit entries</p>
                  <p className="text-xs text-muted-foreground">No logs match the current filters.</p>
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
                      {columns.map((c, i) => (
                        <td key={i} className={`px-5 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                          {c.cell(r)}
                        </td>
                      ))}
                    </tr>
                    {open && (
                      <tr className="border-b last:border-0 bg-muted/20">
                        <td colSpan={colCount} className="px-5 py-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div><span className="font-semibold text-foreground">Action:</span> {r.action}</div>
                              <div><span className="font-semibold text-foreground">Actor:</span> {str(r.actor_email)} {r.actor_id ? `(${r.actor_id})` : ''}</div>
                              <div><span className="font-semibold text-foreground">Entity:</span> {r.entity_type}{r.entity_id ? ` #${r.entity_id}` : ''}</div>
                              <div><span className="font-semibold text-foreground">IP:</span> {str(r.ip_address)}</div>
                              <div><span className="font-semibold text-foreground">When:</span> {fmtDateTime(r.created_at)}</div>
                            </div>
                            <div className="space-y-3">
                              <JsonBlock label="Old data" value={r.old_data} />
                              <JsonBlock label="New data" value={r.new_data} />
                              <JsonBlock label="Metadata" value={r.metadata} />
                            </div>
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
