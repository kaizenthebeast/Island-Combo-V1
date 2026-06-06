'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { customToast } from '@/components/shared/modals/ToastCustom'
import VerifyCardholder from './VerifyCardholder'
import type { LoyverseCardRow } from '@/lib/admin/loyalty'

type Entry = { cardNumber: string; points: number; name?: string | null; email?: string | null }

// Parse pasted CSV: one card per line — "card_number, points, name?, email?".
// Lines whose points column isn't a number (e.g. a header row) are ignored.
const parseCsv = (text: string): Entry[] => {
  const entries: Entry[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const [cardNumber, points, name, email] = line.split(',').map((c) => c.trim())
    const pts = Number(points)
    if (!cardNumber || !Number.isFinite(pts)) continue
    entries.push({ cardNumber, points: pts, name: name || null, email: email || null })
  }
  return entries
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function LoyverseCardsClient({ initialRows }: { initialRows: LoyverseCardRow[] }) {
  const router = useRouter()
  const [csv, setCsv] = useState('')
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    const entries = parseCsv(csv)
    if (entries.length === 0) {
      customToast.warning({ title: 'Nothing to import', description: 'Add at least one "card, points" line.' })
      return
    }
    setImporting(true)
    try {
      const res = await fetch('/api/admin/loyalty/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        customToast.error({ title: 'Import failed', description: payload.message ?? 'Please try again.' })
        return
      }
      customToast.success({ title: 'Cards imported', description: payload.message })
      setCsv('')
      router.refresh()
    } catch {
      customToast.error({ title: 'Import failed', description: 'Something went wrong.' })
    } finally {
      setImporting(false)
    }
  }

  const claimed = initialRows.filter((r) => r.claimed_by).length

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Customer Management"
        title="Customer Loyalty"
        subtitle="Verify cardholders and migrate existing loyalty cards."
      />

      {/* Flow D: link a physical card to a customer (Verified Cardholder) */}
      <VerifyCardholder />

      {/* Import */}
      <div className="mb-8 rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold">Import cards</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          One card per line: <code>card_number, points, name, email</code> (name and email optional).
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          placeholder={`1234565656565, 300, Juan Dela Cruz, juan@example.com\n9876543212345, 150`}
          className="w-full rounded-md border border-border bg-white p-3 font-mono text-[13px] outline-hidden focus:border-ring focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import cards'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Migrated cards</h2>
          <span className="text-xs text-muted-foreground">{claimed}/{initialRows.length} claimed</span>
        </div>

        {initialRows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No cards imported yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">Card Number</th>
                  <th className="px-5 py-3 font-medium">Points</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Imported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-mono text-[13px]">{r.card_number}</td>
                    <td className="px-5 py-3">{r.points.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div>{r.customer_name ?? '—'}</div>
                      {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                    </td>
                    <td className="px-5 py-3">
                      {r.claimed_by ? (
                        <span className="rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-medium text-success">
                          Claimed
                        </span>
                      ) : (
                        <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-medium text-brand">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
