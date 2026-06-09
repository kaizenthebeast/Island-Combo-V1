'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import type { AuditCategory, AuditLog } from '@/shared/types/audit'

const CSV_COLUMNS: { key: keyof AuditLog; header: string }[] = [
  { key: 'created_at',  header: 'Timestamp' },
  { key: 'actor_email', header: 'Actor Email' },
  { key: 'actor_id',    header: 'Actor ID' },
  { key: 'action',      header: 'Action' },
  { key: 'entity_type', header: 'Entity Type' },
  { key: 'entity_id',   header: 'Entity ID' },
  { key: 'ip_address',  header: 'IP Address' },
  { key: 'old_data',    header: 'Old Data' },
  { key: 'new_data',    header: 'New Data' },
  { key: 'metadata',    header: 'Metadata' },
]

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Escape for CSV: wrap in quotes and double any embedded quotes.
  return `"${str.replace(/"/g, '""')}"`
}

// Exports the audit rows matching the CURRENT filters to CSV. Reuses the same
// /api/audit/[category] endpoint (admin-protected) with a high limit.
export default function AuditExport({ category }: { category: AuditCategory }) {
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', '1')
      params.set('limit', '10000')

      const res = await fetch(`/api/audit/${category}?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? 'Export failed')

      const rows: AuditLog[] = json.data ?? []
      if (rows.length === 0) {
        customToast.error({ title: 'Nothing to export', description: 'No logs match the current filters.' })
        return
      }

      const header = CSV_COLUMNS.map((c) => c.header).join(',')
      const lines = rows.map((r) => CSV_COLUMNS.map((c) => cell(r[c.key])).join(','))
      const csv = [header, ...lines].join('\r\n')

      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-${category}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      customToast.error({ title: 'Export failed', description: e instanceof Error ? e.message : 'Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {busy ? 'Exporting…' : 'Export CSV'}
    </button>
  )
}
