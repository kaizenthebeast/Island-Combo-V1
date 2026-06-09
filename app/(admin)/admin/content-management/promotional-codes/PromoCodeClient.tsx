'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/shared/components/admin/PageHeader'
import { DataTable, ColumnDef } from '@/shared/components/admin/DataTable'
import AddPromoCodeDialog from '@/features/promotions/components/admin/AddPromoCodeDialog'
import EditPromoCodeDialog from '@/features/promotions/components/admin/EditPromoCodeDialog'
import DeletePromoCodeDialog from '@/features/promotions/components/admin/DeletePromoCodeDialog'
import StatusBadge, { BadgeVariant } from '@/shared/components/admin/StatusBadge'
import { useTableUrlState } from '@/shared/hooks/use-table-url-state'
import { archivePromoCode } from '@/features/promotions/api/admin/promo-code'
import type { PromoCode, PromoCodeRow, PromoCodeEffectiveStatus } from '@/shared/types/promo-code'

// table row shape

type TableRow = {
  id: number
  code: string
  value: string               // formatted: "10%"
  min_quantity: string        // formatted: "5 items" | "—"
  expires_at: string          // formatted: "Dec 31, 2025" | "—"
  effective_status: PromoCodeEffectiveStatus
  raw: PromoCode
}

// status badge config

const STATUS_BADGE: Record<PromoCodeEffectiveStatus, { label: string; variant: BadgeVariant }> = {
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
  promoCodes: PromoCodeRow[]
  total: number
  page: number
  pageSize: number
}

export default function PromoCodeClient({ promoCodes, total, page, pageSize }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null)
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
          await archivePromoCode(deletingRow.id)
          setActionError(null)
          setDeletingRow(null)
          resolve()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to archive promo code'
          setActionError(message)
          reject(err)
        }
      })
    })
  }

  // rows

  const rows: TableRow[] = useMemo(
    () =>
      promoCodes.map((promoCodeItem) => ({
        id: promoCodeItem.id,
        code: promoCodeItem.code,
        value: `${promoCodeItem.value}%`,
        min_quantity: promoCodeItem.min_quantity != null ? `${promoCodeItem.min_quantity} items` : '—',
        expires_at: formatDate(promoCodeItem.expires_at),
        effective_status: promoCodeItem.effective_status,
        raw: promoCodeItem,
      })),
    [promoCodes],
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
      render: (value) => {
        const { label, variant } = STATUS_BADGE[value as PromoCodeEffectiveStatus] ?? STATUS_BADGE.DRAFT
        return <StatusBadge status={label} variant={variant} />
      },
    },
  ]

  // render

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Promotions"
        title="Promo Codes"
        subtitle="Manage discount promo codes"
        actions={[
          { label: 'Add Promo Code', onClick: () => setAddOpen(true), variant: 'primary' },
        ]}
      />

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
          <p className="text-[12px] font-medium text-danger">{actionError}</p>
        </div>
      )}

      <AddPromoCodeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />

      <EditPromoCodeDialog
        open={!!editingPromoCode}
        onClose={() => setEditingPromoCode(null)}
        selectedPromoCode={editingPromoCode}
      />

      <DeletePromoCodeDialog
        open={!!deletingRow}
        promoCode={deletingRow?.code ?? ''}
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
        onEdit={(row) => setEditingPromoCode(row.raw)}
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
