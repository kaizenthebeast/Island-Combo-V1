'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import type { SecurityAuditLog } from '@/shared/types/audit'

const CSV_COLUMNS: { key: keyof SecurityAuditLog; header: string }[] = [
  { key: 'created_at', header: 'Timestamp' },
  { key: 'event_type', header: 'Event' },
  { key: 'user_id',    header: 'User ID' },
  { key: 'email',      header: 'Email' },
  { key: 'ip_address', header: 'IP Address' },
  { key: 'route',      header: 'Route' },
  { key: 'user_agent', header: 'User Agent' },
  { key: 'details',    header: 'Details' },
]

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Escape for CSV: wrap in quotes and double any embedded quotes.
  return `"${str.replace(/"/g, '""')}"`
}

// Exports the security events matching the CURRENT filters to CSV via the
// admin-protected /api/audit/security endpoint.
export default function SecurityAuditExport() {
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', '1')
      params.set('limit', '100')

      const res = await fetch(`/api/audit/security?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? 'Export failed')

      const rows: SecurityAuditLog[] = json.data ?? []
      if (rows.length === 0) {
        customToast.error({ title: 'Nothing to export', description: 'No events match the current filters.' })
        return
      }

      const header = CSV_COLUMNS.map((c) => c.header).join(',')
      const lines = rows.map((r) => CSV_COLUMNS.map((c) => cell(r[c.key])).join(','))
      const csv = [header, ...lines].join('\r\n')

      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `security-audit-${new Date().toISOString().slice(0, 10)}.csv`
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
