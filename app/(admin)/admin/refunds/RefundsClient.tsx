'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { customToast } from '@/components/shared/modals/ToastCustom'
import { processRefund } from '@/lib/admin/refunds'
import type { AdminRefundRow, RefundStatus } from '@/types/refund'

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
const orderNo = (ref: string) => (ref ? ref.replace(/-/g, '').slice(0, 10).toUpperCase() : '—')

const STATUS_OPTIONS: { value: RefundStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const STATUS_BADGE: Record<RefundStatus, string> = {
  pending:  'bg-warning-tint text-warning',
  refunded: 'bg-success-tint text-success',
  rejected: 'bg-danger-tint text-danger',
}

const PAGE_SIZE = 10

type Dialog = { row: AdminRefundRow; action: 'approve' | 'reject' } | null

export default function RefundsClient({
  rows: serverRows,
  status,
}: {
  rows: AdminRefundRow[]
  status: RefundStatus | 'all'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<Dialog>(null)

  // Search + pagination run client-side over the status set the server returned;
  // the *status* filter itself drives an SSR re-fetch through the ?status param.
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // New status set arrived from the server → back to the first page.
  useEffect(() => setPage(1), [status])

  const setStatus = (value: string) => {
    const params = new URLSearchParams()
    if (value && value !== 'pending') params.set('status', value) // pending is the default
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return serverRows
    return serverRows.filter(
      (r) =>
        orderNo(r.public_ref).toLowerCase().includes(q) ||
        (r.customer_name ?? '').toLowerCase().includes(q) ||
        (r.customer_email ?? '').toLowerCase().includes(q),
    )
  }, [serverRows, search])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: ColumnDef<AdminRefundRow>[] = [
    {
      key: 'public_ref',
      label: 'Order',
      sortable: false,
      render: (v) => <span className="font-mono text-xs">#{orderNo(v as string)}</span>,
    },
    {
      key: 'customer_name',
      label: 'Customer',
      sortable: false,
      render: (_v, r) => (
        <div>
          <div className="font-medium text-foreground">{r.customer_name ?? '—'}</div>
          {r.customer_email && <div className="text-xs text-muted-foreground">{r.customer_email}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      sortable: false,
      render: (v) => <span className="font-semibold">{money(v as number)}</span>,
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: false,
      render: (_v, r) => (
        <div className="max-w-[220px] text-muted-foreground">
          <span className="line-clamp-2">{r.reason ?? '—'}</span>
          {r.media.length > 0 && (
            <span className="mt-0.5 block text-[10px] font-medium text-brand">
              {r.media.length} file{r.media.length > 1 ? 's' : ''} attached
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'requested_at',
      label: 'Requested',
      sortable: false,
      render: (v) => <span className="text-muted-foreground">{fmtDate(v as string)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      sortable: false,
      render: (v) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[v as RefundStatus]}`}>
          {v as string}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'right',
      sortable: false,
      render: (_v, r) =>
        r.status === 'pending' ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDialog({ row: r, action: 'approve' })}
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Approve
            </button>
            <button
              onClick={() => setDialog({ row: r, action: 'reject' })}
              className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-tint"
            >
              Reject
            </button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {r.processed_by_name && <div>by {r.processed_by_name}</div>}
            <div>{fmtDate(r.processed_at)}</div>
            {r.paypal_refund_id && <div className="font-mono text-[10px]">{r.paypal_refund_id}</div>}
          </div>
        ),
    },
  ]

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Fulfillment"
        title="Refunds"
        subtitle="Validate cancellation & refund requests before issuing the PayPal refund."
      />

      <DataTable<AdminRefundRow>
        rows={paged}
        total={filtered.length}
        columns={columns}
        loading={isPending}

        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}

        search={search}
        onSearchChange={(q) => { setSearch(q); setPage(1) }}
        searchPlaceholder="Search by order # or customer…"

        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            onChange: setStatus,
            options: STATUS_OPTIONS,
          },
        ]}

        getRowId={(r) => r.id}
      />

      {dialog && (
        <ActionDialog
          dialog={dialog}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null)
            startTransition(() => router.refresh()) // SSR re-fetch of the current status set
          }}
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
