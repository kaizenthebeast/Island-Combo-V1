'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddCategoryDialog from '@/components/admin/category/AddCategoryDialog'
import EditCategoryDialog from '@/components/admin/category/EditCategoryDialog'
import DeleteCategoryDialog from '@/components/admin/category/DeleteCategoryDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import { CategoryOption } from '@/components/admin/category/forms/CategoryUIForm'
import { useTableUrlState } from '@/shared/hooks/use-table-url-state'
import type { Category } from '@/shared/types/category'
import { softDeleteCategory } from '@/lib/admin/categories/category'

type CategoryStatus = 'ACTIVE' | 'ARCHIVED'

type Row = {
    id: number
    name: string
    subcategory_count: number
    status: CategoryStatus
    raw: Category
}

const STATUS_BADGE: Record<CategoryStatus, { label: string; variant: BadgeVariant }> = {
    ACTIVE:   { label: 'Active',   variant: 'success' },
    ARCHIVED: { label: 'Archived', variant: 'default' },
}

interface Props {
    parents: Category[]
    childrenRows: Category[]
    allParentOptions: CategoryOption[]
    total: number
    page: number
    pageSize: number
}

export default function CategoryClient({
    parents,
    childrenRows,
    allParentOptions,
    total,
    page,
    pageSize,
}: Props) {
    const [open, setOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
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
        sortKey: 'name',
        sortDir: 'asc',
    })

    const handleDeleteConfirm = async () => {
        if (!deletingRow) return

        return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
                try {
                    await softDeleteCategory(deletingRow.id)
                    setDeleteError(null)
                    setDeletingRow(null)
                    resolve()
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to archive category'
                    setDeleteError(message)
                    reject(err)
                }
            })
        })
    }

    const rows: Row[] = useMemo(() => {
        return parents.map((category) => ({
            id: category.id,
            name: category.name,
            subcategory_count: childrenRows.filter((child) => child.parent_id === category.id).length,
            status: category.is_active ? 'ACTIVE' : 'ARCHIVED',
            raw: category,
        }))
    }, [parents, childrenRows])

    const columns: ColumnDef<Row>[] = [
        { key: 'id',                label: 'ID',            width: '80px'                       },
        { key: 'name',              label: 'Category'                                           },
        { key: 'subcategory_count', label: 'Subcategories', align: 'center', sortable: false   },
        {
            key: 'status',
            label: 'Status',
            sortable: false,
            render: (value) => {
                const { label, variant } = STATUS_BADGE[value as CategoryStatus] ?? STATUS_BADGE.ACTIVE
                return <StatusBadge status={label} variant={variant} />
            },
        },
    ]

    return (
        <section className="min-h-full bg-muted px-6 py-10">
            <PageHeader
                eyebrow="Catalog"
                title="Categories"
                subtitle="Manage your product categories"
                actions={[
                    { label: 'Add Category', onClick: () => setOpen(true), variant: 'primary' },
                ]}
            />

            {deleteError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
                    <p className="text-[12px] text-danger font-medium">{deleteError}</p>
                </div>
            )}

            <AddCategoryDialog open={open} onClose={() => setOpen(false)} />

            <EditCategoryDialog
                selectedCategory={editingCategory}
                parentOptions={allParentOptions}
                open={!!editingCategory}
                onClose={() => setEditingCategory(null)}
            />

            <DeleteCategoryDialog
                open={!!deletingRow}
                categoryName={deletingRow?.name ?? ''}
                categoryId={deletingRow?.id ?? ''}
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
                searchPlaceholder="Search categories…"

                filterValue={state.filter || 'All'}
                onFilterChange={setFilter}
                filterOptions={['All', 'ACTIVE', 'ARCHIVED']}

                sortKey={state.sortKey as keyof Row | undefined}
                sortDir={state.sortDir}
                onSortChange={(key, dir) => setSort(String(key), dir)}

                getRowId={(row) => row.id}
                onDelete={(row) => setDeletingRow(row)}
                onEdit={(row) => setEditingCategory(row.raw)}
                expandedRowRender={(row) => {
                    const subs = childrenRows.filter((category) => category.parent_id === row.id)

                    if (subs.length === 0) {
                        return (
                            <p className="text-[12px] text-muted-foreground italic">
                                No subcategories yet.
                            </p>
                        )
                    }

                    return (
                        <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                                Subcategories
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {subs.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[12px] text-foreground"
                                    >
                                        <span className="font-medium">{sub.name}</span>
                                        <span className="text-muted-foreground">#{sub.id}</span>
                                        {!sub.is_active && (
                                            <StatusBadge status="Archived" variant="default" />
                                        )}
                                        <button
                                            onClick={() => setEditingCategory(sub)}
                                            className="text-info hover:text-info transition-colors"
                                            title="Edit"
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1 1-4.5L16.862 3.487z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setDeletingRow({
                                                id: sub.id,
                                                name: sub.name,
                                                subcategory_count: 0,
                                                status: sub.is_active ? 'ACTIVE' : 'ARCHIVED',
                                                raw: sub,
                                            })}
                                            className="text-danger hover:text-danger transition-colors"
                                            title="Archive"
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }}
            />
        </section>
    )
}
