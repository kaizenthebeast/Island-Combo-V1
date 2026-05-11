'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddUsersDialog from '@/components/admin/users/AddUsersDialog'
import EditUserDialog from '@/components/admin/users/EditUserDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import type { AdminUser } from '@/types/users'

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
        case 'admin':
            return 'danger'
        case 'staff':
            return 'warning'
        case 'customer':
        default:
            return 'success'
    }
}

export default function UsersClient({ users }: { users: AdminUser[] }) {
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
    const [isPending, startTransition] = useTransition()
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleDelete = (row: Row) => {
        startTransition(async () => {
            console.log('deleted')
            setDeleteError(null)
        })
    }

    const rows: Row[] = useMemo(() => {
        return users.map((u) => ({
            user_id: u.user_id,
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
            email: u.email ?? '—',
            phone: u.phone_text ?? '—',
            role: u.role,
            points: u.total_points,                                         
            joined: new Date(u.member_since).toLocaleDateString(),          
            raw: u,
        }))
    }, [users])

    const columns: ColumnDef<Row>[] = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        {
            key: 'role',
            label: 'Role',
            align: 'center',
            render: (v) => (
                <StatusBadge
                    status={String(v)}
                    variant={getRoleVariant(String(v))}
                />
            ),
        },
        {
            key: 'points',
            label: 'Points',
            align: 'right',
        },
        {
            key: 'joined',
            label: 'Joined',
            align: 'right',
        },
    ]

    return (
        <section className="min-h-screen bg-slate-50 px-6 py-10">
            <PageHeader
                eyebrow="People"
                title="Customer"
                subtitle="Manage your registered customers and staff"
            />

            {deleteError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <p className="text-[12px] text-rose-700 font-medium">{deleteError}</p>
                </div>
            )}

    

            <EditUserDialog
                user={editingUser}
                open={!!editingUser}
                onClose={() => setEditingUser(null)}
            />

            <DataTable<Row>
                data={rows}
                columns={columns}
                searchKeys={['name', 'email', 'phone']}
                filterKey="role"
                filterOptions={['All', 'customer',]}
                defaultSortKey="name"
                getRowId={(row) => row.user_id}
                onEdit={(row) => setEditingUser(row.raw)}
                onDelete={handleDelete}
                expandedRowRender={(row) => {
                    const u = row.raw

                    return (
                        <div className="space-y-4 text-sm">

                            {/* PERSONAL INFO */}
                            <div>
                                <h4 className="font-semibold text-slate-700">Personal Info</h4>
                                <ul className="mt-1 space-y-1 text-slate-600">
                                    <li><strong>Sex:</strong> {u.sex ?? '—'}</li>
                                    <li><strong>Age:</strong> {u.age ?? '—'}</li>
                                </ul>
                            </div>

                            {/* DEFAULT ADDRESS */}
                            {u.default_address && (                                  
                                <div>
                                    <h4 className="font-semibold text-slate-700">Default Address</h4>
                                    <div className="mt-1 border rounded-lg p-3 text-slate-600">
                                        <p>
                                            {u.default_address}, {u.default_locality}, {u.default_postal_code}, {u.default_country}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {u.total_addresses} address{u.total_addresses !== 1 ? 'es' : ''} total
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* POINTS SUMMARY */}
                            {u.total_orders > 0 && (                                    
                                <div>
                                    <h4 className="font-semibold text-slate-700">Points Summary</h4>
                                    <ul className="mt-1 space-y-1 text-slate-600">
                                        <li className="flex justify-between">
                                            <span>Lifetime Earned</span>
                                            <span className="text-green-600">+{u.lifetime_points_earned} pts</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>Lifetime Spent</span>
                                            <span className="text-red-500">-{u.lifetime_points_spent} pts</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>Current Balance</span>
                                            <span className="font-medium">{u.total_points} pts</span>
                                        </li>
                                        {u.last_pts_activity && (
                                            <li className="text-xs text-slate-400">
                                                Last activity: {new Date(u.last_pts_activity).toLocaleDateString()}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* ORDER STATS */}
                            <div>
                                <h4 className="font-semibold text-slate-700">Order Stats</h4>
                                <ul className="mt-1 space-y-1 text-slate-600">
                                    <li className="flex justify-between">
                                        <span>Total Orders</span>
                                        <span>{u.total_orders}</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Total Spent</span>
                                        <span>₱{u.total_order_value.toLocaleString()}</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Discounts Received</span>
                                        <span>₱{u.total_discount_received.toLocaleString()}</span>
                                    </li>
                                    {u.last_order_at && (
                                        <li className="text-xs text-slate-400">
                                            Last order: {new Date(u.last_order_at).toLocaleDateString()}
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* META */}
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