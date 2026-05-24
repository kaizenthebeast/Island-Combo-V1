'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddUsersDialog from '@/components/admin/users/AddUsersDialog'
import EditUserDialog from '@/components/admin/users/EditUserDialog'
import DeleteStaffDialog from '@/components/admin/users/DeleteStaffDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { softDeleteUser } from '@/lib/users'
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
  const [addOpen, setAddOpen] = useState(false)
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
    return staff.map((u) => ({
      user_id: u.user_id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
      email: u.email ?? '—',
      phone: u.phone_text ?? '—',
      role: u.role,
      status: u.is_active ? 'ACTIVE' : 'INACTIVE',
      joined: new Date(u.member_since).toLocaleDateString(),
      raw: u,
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
      render: (v) => (
        <StatusBadge status={String(v)} variant={getRoleVariant(String(v))} />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (v) => {
        const { label, variant } = STATUS_BADGE[v as StaffStatus] ?? STATUS_BADGE.ACTIVE
        return <StatusBadge status={label} variant={variant} />
      },
    },
    { key: 'joined', label: 'Joined', align: 'right', sortable: false },
  ]

  return (
    <section className="min-h-full bg-slate-50 px-6 py-10">
      <PageHeader
        eyebrow="People"
        title="Staff"
        subtitle="Manage your staff and administrators"
        actions={[
          { label: 'Create Staff', onClick: () => setAddOpen(true), variant: 'primary' },
        ]}
      />

      {deleteError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
          <p className="text-[12px] text-rose-700 font-medium">{deleteError}</p>
        </div>
      )}

      <AddUsersDialog open={addOpen} onClose={() => setAddOpen(false)} />

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
          const u = row.raw
          return (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-slate-700">Personal Info</h4>
                <ul className="mt-1 space-y-1 text-slate-600">
                  <li><strong>Sex:</strong> {u.sex ?? '—'}</li>
                  <li><strong>Age:</strong> {u.age ?? '—'}</li>
                </ul>
              </div>
              {u.default_address && (
                <div>
                  <h4 className="font-semibold text-slate-700">Default Address</h4>
                  <div className="mt-1 border rounded-lg p-3 text-slate-600">
                    <p>
                      {u.default_address}, {u.default_locality},{' '}
                      {u.default_postal_code}, {u.default_country}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {u.total_addresses} address{u.total_addresses !== 1 ? 'es' : ''} total
                    </p>
                  </div>
                </div>
              )}
              <div className="text-xs text-slate-400">
                User ID: {u.user_id} · Joined: {new Date(u.member_since).toLocaleString()}
              </div>
            </div>
          )
        }}
      />
    </section>
  )
}
