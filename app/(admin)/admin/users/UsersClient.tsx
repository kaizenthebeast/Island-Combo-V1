'use client'

import { useMemo, useTransition, useState } from 'react'
import { PageHeader } from '@/shared/components/admin/PageHeader'
import { DataTable, ColumnDef } from '@/shared/components/admin/DataTable'
import StatusBadge, { BadgeVariant } from '@/shared/components/admin/StatusBadge'
import { useTableUrlState } from '@/shared/hooks/use-table-url-state'
import { deleteUser } from '@/features/users/api/users'
import type { AdminUser } from '@/shared/types/users'

type Row = {
    user_id: string
    name: string
    email: string
    phone: string
    role: string
    points: number
    joined: string
    raw: AdminUser
}

const getRoleVariant = (role: string): BadgeVariant => {
    switch (role) {
        case 'admin':    return 'danger'
        case 'staff':    return 'warning'
        case 'customer':
        default:         return 'success'
    }
}

interface Props {
    users: AdminUser[]
    total: number
    page: number
    pageSize: number
}

export default function UsersClient({ users, total, page, pageSize }: Props) {
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

    const handleDelete = (row: Row) => {
        startTransition(async () => {
            setDeleteError(null)
            const result = await deleteUser(row.user_id)
            if (!result.success) {
                setDeleteError(result.message ?? 'Failed to delete user.')
            }
        })
    }

    const rows: Row[] = useMemo(() => {
        return users.map((user) => ({
            user_id: user.user_id,
            name: [user.first_name, user.last_name].filter(Boolean).join(' ') || '—',
            email: user.email ?? '—',
            phone: user.phone_text ?? '—',
            role: user.role,
            points: user.total_points,
            joined: new Date(user.member_since).toLocaleDateString(),
            raw: user,
        }))
    }, [users])

    const columns: ColumnDef<Row>[] = [
        { key: 'name',   label: 'Name',  sortable: false },
        { key: 'email',  label: 'Email', sortable: false },
        { key: 'phone',  label: 'Phone', sortable: false },
        {
            key: 'role',
            label: 'Role',
            align: 'center',
            sortable: false,
            render: (value) => (
                <StatusBadge
                    status={String(value)}
                    variant={getRoleVariant(String(value))}
                />
            ),
        },
        { key: 'points', label: 'Points', align: 'right', sortable: false },
        { key: 'joined', label: 'Joined', align: 'right', sortable: false },
    ]

    return (
        <section className="min-h-full bg-muted px-6 py-10">
            <PageHeader
                eyebrow="People"
                title="Customers"
                subtitle="View your registered customers"
            />

            {deleteError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
                    <p className="text-[12px] text-danger font-medium">{deleteError}</p>
                </div>
            )}

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
                filterOptions={['All', 'customer', 'staff', 'admin']}

                sortKey={state.sortKey as keyof Row | undefined}
                sortDir={state.sortDir}
                onSortChange={(key, dir) => setSort(String(key), dir)}

                getRowId={(row) => row.user_id}
                onDelete={handleDelete}
                expandedRowRender={(row) => {
                    const user = row.raw

                    return (
                        <div className="space-y-4 text-sm">

                            {/* PERSONAL INFO */}
                            <div>
                                <h4 className="font-semibold text-foreground">Personal Info</h4>
                                <ul className="mt-1 space-y-1 text-muted-foreground">
                                    <li><strong>Sex:</strong> {user.sex ?? '—'}</li>
                                    <li><strong>Age:</strong> {user.age ?? '—'}</li>
                                </ul>
                            </div>

                            {/* DEFAULT ADDRESS */}
                            {user.default_address && (
                                <div>
                                    <h4 className="font-semibold text-foreground">Default Address</h4>
                                    <div className="mt-1 border rounded-lg p-3 text-muted-foreground">
                                        <p>
                                            {user.default_address}, {user.default_locality}, {user.default_postal_code}, {user.default_country}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {user.total_addresses} address{user.total_addresses !== 1 ? 'es' : ''} total
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* POINTS SUMMARY */}
                            {user.total_orders > 0 && (
                                <div>
                                    <h4 className="font-semibold text-foreground">Points Summary</h4>
                                    <ul className="mt-1 space-y-1 text-muted-foreground">
                                        <li className="flex justify-between">
                                            <span>Lifetime Earned</span>
                                            <span className="text-success">+{user.lifetime_points_earned} pts</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>Lifetime Spent</span>
                                            <span className="text-danger">-{user.lifetime_points_spent} pts</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>Current Balance</span>
                                            <span className="font-medium">{user.total_points} pts</span>
                                        </li>
                                        {user.last_pts_activity && (
                                            <li className="text-xs text-muted-foreground">
                                                Last activity: {new Date(user.last_pts_activity).toLocaleDateString()}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* ORDER STATS */}
                            <div>
                                <h4 className="font-semibold text-foreground">Order Stats</h4>
                                <ul className="mt-1 space-y-1 text-muted-foreground">
                                    <li className="flex justify-between">
                                        <span>Total Orders</span>
                                        <span>{user.total_orders}</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Total Spent</span>
                                        <span>₱{user.total_order_value.toLocaleString()}</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Discounts Received</span>
                                        <span>₱{user.total_discount_received.toLocaleString()}</span>
                                    </li>
                                    {user.last_order_at && (
                                        <li className="text-xs text-muted-foreground">
                                            Last order: {new Date(user.last_order_at).toLocaleDateString()}
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* META */}
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
