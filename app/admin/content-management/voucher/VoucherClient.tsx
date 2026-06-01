'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddVoucherDialog from '@/components/admin/voucher/AddVoucherDialog'
import EditVoucherDialog from '@/components/admin/voucher/EditVoucherDialog'
import DeleteVoucherDialog from '@/components/admin/voucher/DeleteVoucherDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { archiveVoucher } from '@/lib/admin/voucher'
import type { Voucher, VoucherRow, VoucherEffectiveStatus } from '@/types/voucher'

// table row shape

type TableRow = {
  id: number
  code: string
  value: string               // formatted: "10%"
  min_quantity: string        // formatted: "5 items" | "—"
  expires_at: string          // formatted: "Dec 31, 2025" | "—"
  effective_status: VoucherEffectiveStatus
  raw: Voucher
}

// status badge config

const STATUS_BADGE: Record<VoucherEffectiveStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE:   { label: 'Active',   variant: 'success' },
  DRAFT:    { label: 'Draft',    variant: 'warning' },
  EXPIRED:  { label: 'Expired',  variant: 'error'   },
  ARCHIVED: { label: 'Archived', variant: 'default' },
}

// formatters

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// component

interface Props {
  voucher: VoucherRow[]
  total: number
  page: number
  pageSize: number
}

export default function VoucherClient({ voucher, total, page, pageSize }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [deletingRow, setDeletingRow] = useState<TableRow | null>(null)
  const [, setRestoringRow] = useState<TableRow | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const {
    state,
    isPending,
    searchInput,
    setSearchInput,
    setPage,
    setPageSize,
    setFilter,
    setSort,
  } = useTableUrlState({
    pageSize,
    filter: 'All',
    sortKey: 'created_at',
    sortDir: 'desc',
  })

  // archive

  const handleArchiveConfirm = (): Promise<void> => {
    if (!deletingRow) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await archiveVoucher(deletingRow.id)
          setActionError(null)
          setDeletingRow(null)
          resolve()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to archive voucher'
          setActionError(message)
          reject(err)
        }
      })
    })
  }

  // rows

  const rows: TableRow[] = useMemo(
    () =>
      voucher.map((v) => ({
        id: v.id,
        code: v.code,
        value: `${v.value}%`,
        min_quantity: v.min_quantity != null ? `${v.min_quantity} items` : '—',
        expires_at: formatDate(v.expires_at),
        effective_status: v.effective_status,
        raw: v,
      })),
    [voucher],
  )

  // columns

  const columns: ColumnDef<TableRow>[] = [
    { key: 'id',               label: 'ID',       width: '70px'                       },
    { key: 'code',             label: 'Code'                                          },
    { key: 'value',            label: 'Discount',     align: 'center'                 },
    { key: 'min_quantity',     label: 'Min. Qty',     align: 'center', sortable: false },
    { key: 'expires_at',       label: 'Expires',      align: 'center'                 },
    {
      key: 'effective_status',
      label: 'Status',
      sortable: false,
      render: (v) => {
        const { label, variant } = STATUS_BADGE[v as VoucherEffectiveStatus] ?? STATUS_BADGE.DRAFT
        return <StatusBadge status={label} variant={variant} />
      },
    },
  ]

  // render

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Promotions"
        title="Vouchers"
        subtitle="Manage discount vouchers and promo codes"
        actions={[
          { label: 'Add Voucher', onClick: () => setAddOpen(true), variant: 'primary' },
        ]}
      />

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
          <p className="text-[12px] font-medium text-danger">{actionError}</p>
        </div>
      )}

      <AddVoucherDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />

      <EditVoucherDialog
        open={!!editingVoucher}
        onClose={() => setEditingVoucher(null)}
        selectedVoucher={editingVoucher}
      />

      <DeleteVoucherDialog
        open={!!deletingRow}
        voucherCode={deletingRow?.code ?? ''}
        onConfirm={handleArchiveConfirm}
        onOpenChange={(open) => { if (!open) setDeletingRow(null) }}
      />

      <DataTable<TableRow>
        rows={rows}
        total={total}
        columns={columns}
        loading={isPending}

        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}

        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search by code…"

        filterValue={state.filter || 'All'}
        onFilterChange={setFilter}
        filterOptions={['All', 'ACTIVE', 'DRAFT', 'EXPIRED', 'ARCHIVED']}

        sortKey={state.sortKey as keyof TableRow | undefined}
        sortDir={state.sortDir}
        onSortChange={(key, dir) => setSort(String(key), dir)}

        getRowId={(row) => row.id}
        onEdit={(row) => setEditingVoucher(row.raw)}
        onDelete={(row) => {
          if (row.effective_status === 'ARCHIVED') {
            setRestoringRow(row)
          } else {
            setDeletingRow(row)
          }
        }}
      />
    </section>
  )
}
