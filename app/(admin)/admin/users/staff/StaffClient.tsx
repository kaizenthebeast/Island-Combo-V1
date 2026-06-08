'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import EditUserDialog from '@/components/admin/users/EditUserDialog'
import DeleteStaffDialog from '@/components/admin/users/DeleteStaffDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { softDeleteUser } from '@/lib/admin/users/users'
import type { AdminStaff } from '@/types/users'

type StaffStatus = 'ACTIVE' | 'INACTIVE'

type Row = {
  user_id: string
  name: string
  email: string
  phone: string
  role: string
  status: StaffStatus
  joined: string
  raw: AdminStaff
}

const getRoleVariant = (role: string): BadgeVariant => {
  switch (role) {
    case 'admin': return 'danger'
    case 'staff':
    default:      return 'warning'
  }
}

const STATUS_BADGE: Record<StaffStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE:   { label: 'Active',   variant: 'success' },
  INACTIVE: { label: 'Inactive', variant: 'default' },
}

interface Props {
  staff: AdminStaff[]
  total: number
  page: number
  pageSize: number
}

export default function StaffClient({ staff, total, page, pageSize }: Props) {
  const [editingUser, setEditingUser] = useState<AdminStaff | null>(null)
  const [deletingRow, setDeletingRow] = useState<Row | null>(null)
  const [, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    sortKey: 'member_since',
    sortDir: 'desc',
  })

  const handleDeleteConfirm = async () => {
    if (!deletingRow) return

    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await softDeleteUser(deletingRow.user_id)
          if (!result.success) throw new Error(result.message)
          setDeleteError(null)
          setDeletingRow(null)
          resolve()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to deactivate staff'
          setDeleteError(message)
          reject(err)
        }
      })
    })
  }

  const rows: Row[] = useMemo(() => {
    return staff.map((user) => ({
      user_id: user.user_id,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || '—',
      email: user.email ?? '—',
      phone: user.phone_text ?? '—',
      role: user.role,
      status: user.is_active ? 'ACTIVE' : 'INACTIVE',
      joined: new Date(user.member_since).toLocaleDateString(),
      raw: user,
    }))
  }, [staff])

  const columns: ColumnDef<Row>[] = [
    { key: 'name',  label: 'Name',  sortable: false },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'phone', label: 'Phone', sortable: false },
    {
      key: 'role',
      label: 'Role',
      align: 'center',
      sortable: false,
      render: (value) => (
        <StatusBadge status={String(value)} variant={getRoleVariant(String(value))} />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (value) => {
        const { label, variant } = STATUS_BADGE[value as StaffStatus] ?? STATUS_BADGE.ACTIVE
        return <StatusBadge status={label} variant={variant} />
      },
    },
    { key: 'joined', label: 'Joined', align: 'right', sortable: false },
  ]

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="People"
        title="Staff"
        subtitle="Manage your staff and administrators"
      />

      {deleteError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
          <p className="text-[12px] text-danger font-medium">{deleteError}</p>
        </div>
      )}

      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
      />

      <DeleteStaffDialog
        open={!!deletingRow}
        staffName={deletingRow?.name ?? ''}
        staffId={deletingRow?.user_id ?? ''}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(isOpen) => { if (!isOpen) setDeletingRow(null) }}
      />

      <DataTable<Row>
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
        searchPlaceholder="Search by name, email, or phone…"

        filterValue={state.filter || 'All'}
        onFilterChange={setFilter}
        filterOptions={['All', 'ACTIVE', 'INACTIVE']}

        sortKey={state.sortKey as keyof Row | undefined}
        sortDir={state.sortDir}
        onSortChange={(key, dir) => setSort(String(key), dir)}

        getRowId={(row) => row.user_id}
        onEdit={(row) => setEditingUser(row.raw)}
        onDelete={(row) => setDeletingRow(row)}
        expandedRowRender={(row) => {
          const user = row.raw
          return (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-foreground">Personal Info</h4>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li><strong>Sex:</strong> {user.sex ?? '—'}</li>
                  <li><strong>Age:</strong> {user.age ?? '—'}</li>
                </ul>
              </div>
              {user.default_address && (
                <div>
                  <h4 className="font-semibold text-foreground">Default Address</h4>
                  <div className="mt-1 border rounded-lg p-3 text-muted-foreground">
                    <p>
                      {user.default_address}, {user.default_locality},{' '}
                      {user.default_postal_code}, {user.default_country}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.total_addresses} address{user.total_addresses !== 1 ? 'es' : ''} total
                    </p>
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                User ID: {user.user_id} · Joined: {new Date(user.member_since).toLocaleString()}
              </div>
            </div>
          )
        }}
      />
    </section>
  )
}
