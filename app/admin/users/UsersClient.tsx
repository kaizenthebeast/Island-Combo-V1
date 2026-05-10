'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddUsersDialog from '@/components/admin/users/AddUsersDialog'
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
    const [open, setOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
    const [isPending, startTransition] = useTransition()
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // const handleDelete = (row: Row) => {
    //     startTransition(async () => {
    //         const result = await deleteUser(row.user_id)

    //         if (!result.success) {
    //             setDeleteError(result.message)
    //             return
    //         }

    //         setDeleteError(null)
    //     })
    // }

    const rows: Row[] = useMemo(() => {
        return users.map((u) => ({
            user_id: u.user_id,
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
            email: u.email ?? '—',
            phone: u.phone_text ?? '—',
            role: u.role,
            points: u.profile_pts?.total_pts ?? 0,
            joined: new Date(u.created_at).toLocaleDateString(),
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
                title="Users"
                subtitle="Manage your registered customers and staff"
                actions={[
                    { label: 'Export', onClick: () => { }, variant: 'secondary' },
                ]}
            />

            {deleteError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <p className="text-[12px] text-rose-700 font-medium">{deleteError}</p>
                </div>
            )}
            <AddUsersDialog open={open} onClose={() => setOpen(false)} />

            {/* <EditUserDialog
                user={editingUser}
                open={!!editingUser}
                onClose={() => setEditingUser(null)}
            /> */}

            <DataTable<Row>
                data={rows}
                columns={columns}
                searchKeys={['name', 'email', 'phone']}
                filterKey="role"
                filterOptions={['All', 'customer', 'staff', 'admin']}
                defaultSortKey="name"
                getRowId={(row) => row.user_id}
                onEdit={(row) => setEditingUser(row.raw)}
                onDelete={(row) => console.log('delete')}
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

                            {/* ADDRESSES */}
                            {u.addresses && u.addresses.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-700">Addresses</h4>
                                    <div className="space-y-2 mt-1">
                                        {u.addresses.map((a, i) => (
                                            <div key={i} className="border rounded-lg p-3 text-slate-600">
                                                <p>{a.address}, {a.locality}, {a.postal_code}, {a.country}</p>
                                                {a.make_default && (
                                                    <span className="text-xs text-blue-500 font-medium">Default</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* POINTS HISTORY */}
                            {u.profile_pts_transaction_records && u.profile_pts_transaction_records.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-700">Points History</h4>
                                    <ul className="mt-1 space-y-1 text-slate-600">
                                        {u.profile_pts_transaction_records.map((t, i) => (
                                            <li key={i} className="flex justify-between">
                                                <span>{t.reason ?? 'Order #' + t.order_id}</span>
                                                <span className={t.points >= 0 ? 'text-green-600' : 'text-red-500'}>
                                                    {t.points >= 0 ? '+' : ''}{t.points} pts
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* META */}
                            <div className="text-xs text-slate-400">
                                User ID: {u.user_id} · Joined: {new Date(u.created_at).toLocaleString()}
                            </div>

                        </div>
                    )
                }}
            />
        </section>
    )
}