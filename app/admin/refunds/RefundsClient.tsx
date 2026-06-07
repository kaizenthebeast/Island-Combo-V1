'use client'

import { useState, useTransition } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { customToast } from '@/components/shared/modals/ToastCustom'
import { getRefunds, processRefund } from '@/lib/admin/refunds'
import type { AdminRefundRow, RefundStatus } from '@/lib/types/refund'

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
const orderNo = (ref: string) => (ref ? ref.replace(/-/g, '').slice(0, 10).toUpperCase() : '—')

const TABS: { key: RefundStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

const STATUS_BADGE: Record<RefundStatus, string> = {
  pending:  'bg-warning-tint text-warning',
  refunded: 'bg-success-tint text-success',
  rejected: 'bg-danger-tint text-danger',
}

type Dialog = { row: AdminRefundRow; action: 'approve' | 'reject' } | null

export default function RefundsClient({ initialRows }: { initialRows: AdminRefundRow[] }) {
  const [rows, setRows] = useState<AdminRefundRow[]>(initialRows)
  const [tab, setTab] = useState<RefundStatus | 'all'>('pending')
  const [loading, startLoad] = useTransition()
  const [dialog, setDialog] = useState<Dialog>(null)

  const switchTab = (key: RefundStatus | 'all') => {
    setTab(key)
    startLoad(async () => {
      const res = await getRefunds(key)
      if (res.success) setRows(res.rows)
    })
  }

  const refresh = async () => {
    const res = await getRefunds(tab)
    if (res.success) setRows(res.rows)
  }

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Fulfillment"
        title="Refunds"
        subtitle="Validate cancellation & refund requests before issuing the PayPal refund."
      />

      <div className="mb-4 inline-flex rounded-xl border border-border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted text-left text-xs font-semibold">
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Requested</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-14 text-center text-xs text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-14 text-center text-sm text-muted-foreground">No refund requests here.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">#{orderNo(r.public_ref)}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">{r.customer_name ?? '—'}</div>
                    {r.customer_email && <div className="text-xs text-muted-foreground">{r.customer_email}</div>}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{money(r.amount)}</td>
                  <td className="px-5 py-3 max-w-[220px] text-muted-foreground">
                    <span className="line-clamp-2">{r.reason ?? '—'}</span>
                    {r.media.length > 0 && (
                      <span className="mt-0.5 block text-[10px] font-medium text-brand">{r.media.length} file{r.media.length > 1 ? 's' : ''} attached</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{fmtDate(r.requested_at)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setDialog({ row: r, action: 'approve' })}
                          className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Approve</button>
                        <button onClick={() => setDialog({ row: r, action: 'reject' })}
                          className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-tint">Reject</button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {r.processed_by_name && <div>by {r.processed_by_name}</div>}
                        <div>{fmtDate(r.processed_at)}</div>
                        {r.paypal_refund_id && <div className="font-mono text-[10px]">{r.paypal_refund_id}</div>}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <ActionDialog
          dialog={dialog}
          onClose={() => setDialog(null)}
          onDone={async () => { setDialog(null); await refresh() }}
        />
      )}
    </section>
  )
}

function ActionDialog({
  dialog, onClose, onDone,
}: { dialog: NonNullable<Dialog>; onClose: () => void; onDone: () => void }) {
  const { row, action } = dialog
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()

  const confirm = () => {
    start(async () => {
      const res = await processRefund(row.id, action, {
        note,
        password: action === 'approve' ? password : undefined,
      })
      if (!res.success) { customToast.error({ title: "Couldn't process", description: res.message }); return }
      customToast.success({ title: action === 'approve' ? 'Refund issued' : 'Request rejected', description: res.message })
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-foreground">
          {action === 'approve' ? 'Approve refund' : 'Reject request'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Order #{orderNo(row.public_ref)} · {money(row.amount)} · {row.customer_name ?? '—'}
        </p>
        {row.reason && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-foreground">“{row.reason}”</p>}

        {row.media.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">Customer evidence ({row.media.length})</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {row.media.map((m, i) =>
                m.isVideo ? (
                  <video key={i} src={m.url} controls className="h-20 w-20 rounded-md border border-border object-cover" />
                ) : (
                  <a key={i} href={m.url} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="evidence" className="h-full w-full object-cover" />
                  </a>
                ),
              )}
            </div>
          </div>
        )}

        {action === 'approve' && (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              Approving will <span className="font-medium text-foreground">issue the PayPal refund automatically</span>, cancel the order, and restore stock + points. This is recorded against your account.
            </p>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Confirm with your password (2FA)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Your account password"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </>
        )}

        <label className="mt-3 block text-xs font-medium text-muted-foreground">Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand" />

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={confirm} disabled={pending || (action === 'approve' && !password.trim())}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${action === 'approve' ? 'bg-success' : 'bg-danger'}`}>
            {pending ? 'Working…' : action === 'approve' ? 'Approve & Refund' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}
