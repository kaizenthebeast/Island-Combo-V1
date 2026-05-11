'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddCategoryDialog from '@/components/admin/category/AddCategoryDialog'
import EditCategoryDialog from '@/components/admin/category/EditCategoryDialog'
import { CategoryOption } from '@/components/admin/category/forms/CategoryUIForm'
import type { Category } from '@/types/category'
import { deleteCategory } from '@/lib/category'

type Row = {
    id: number
    name: string
    subcategory_count: number
    raw: Category
}

export default function CategoryClient({ categories }: { categories: Category[] }) {
    const [open, setOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [isPending, startTransition] = useTransition()
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleDelete = (row: Row) => {
        startTransition(async () => {
            const result = await deleteCategory(row.id, 'category')

            if (!result.success) {
                setDeleteError(result.message)
                return
            }

            setDeleteError(null)
        })
    }

    const parentCategories = useMemo(
        () => categories.filter((c) => c.parent_id === null),
        [categories]
    )

    const childCategories = useMemo(
        () => categories.filter((c) => c.parent_id !== null),
        [categories]
    )

    const parentOptions: CategoryOption[] = useMemo(
        () => parentCategories.map((c) => ({ category_id: c.id, name: c.name })),
        [parentCategories]
    )

    const rows: Row[] = useMemo(() => {
        return parentCategories.map((c) => ({
            id: c.id,
            name: c.name,
            subcategory_count: childCategories.filter((child) => child.parent_id === c.id).length,
            raw: c,
        }))
    }, [parentCategories, childCategories])

    const columns: ColumnDef<Row>[] = [
        { key: 'id', label: 'ID', width: '80px' },
        { key: 'name', label: 'Category' },
        { key: 'subcategory_count', label: 'Subcategories', align: 'center' },
    ]

    return (
        <section className="min-h-screen bg-slate-50 px-6 py-10">
            <PageHeader
                eyebrow="Catalog"
                title="Categories"
                subtitle="Manage your product categories"
                actions={[
                    { label: 'Add Category', onClick: () => setOpen(true), variant: 'primary' },
                ]}
            />

            {deleteError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <p className="text-[12px] text-rose-700 font-medium">{deleteError}</p>
                </div>
            )}

            <AddCategoryDialog
                open={open}
                onClose={() => setOpen(false)}
            />
            <EditCategoryDialog
                selectedCategory={editingCategory}
                parentOptions={parentOptions}
                open={!!editingCategory}
                onClose={() => setEditingCategory(null)}
            />

            <DataTable<Row>
                data={rows}
                columns={columns}
                searchKeys={['name']}
                defaultSortKey="name"
                getRowId={(row) => row.id}
                onDelete={(row) => handleDelete(row)}
                onEdit={(row) => setEditingCategory(row.raw)}
                expandedRowRender={(row) => {
                    const subs = childCategories.filter((c) => c.parent_id === row.id)

                    if (subs.length === 0) {
                        return (
                            <p className="text-[12px] text-slate-400 italic">
                                No subcategories yet.
                            </p>
                        )
                    }

                    return (
                        <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                                Subcategories
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {subs.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700"
                                    >
                                        <span className="font-medium">{sub.name}</span>
                                        <span className="text-slate-300">#{sub.id}</span>
                                        <button
                                            onClick={() => setEditingCategory(sub)}
                                            className="text-blue-400 hover:text-blue-600 transition-colors"
                                            title="Edit"
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1 1-4.5L16.862 3.487z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete({
                                                id: sub.id,
                                                name: sub.name,
                                                subcategory_count: 0,
                                                raw: sub
                                            })}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                            title="Delete"
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