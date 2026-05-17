'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddProductDialog from '@/components/admin/products/AddProductDialog'
import EditProductDialog from '@/components/admin/products/EditProductDialog'
import DeleteProductDialog from '@/components/admin/products/DeleteProductDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import type { AdminProduct, ProductStatus } from '@/types/product'
import { softDeleteProduct } from '@/lib/product'

type Row = {
    product_id: number
    name: string
    category: string
    type: string
    variants: number
    stock: number
    status: ProductStatus
    raw: AdminProduct
}

const STATUS_BADGE: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
    ACTIVE:   { label: 'Active',   variant: 'success'  },
    DRAFT:    { label: 'Draft',    variant: 'warning'  },
    HIDDEN:   { label: 'Hidden',   variant: 'default'  },
    ARCHIVED: { label: 'Archived', variant: 'default'  },
}

export default function ProductsClient({ products }: { products: AdminProduct[] }) {
    const [open, setOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
    const [deletingRow, setDeletingRow] = useState<Row | null>(null)
    const [, startTransition] = useTransition()
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleDeleteConfirm = async () => {
        if (!deletingRow) return

        return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
                try {
                    await softDeleteProduct(deletingRow.product_id)
                    setDeleteError(null)
                    setDeletingRow(null)
                    resolve()
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to archive product'
                    setDeleteError(message)
                    reject(err)
                }
            })
        })
    }

    const rows: Row[] = useMemo(() => {
        return products.map((p) => ({
            product_id: p.product_id,
            name:       p.name,
            category:   p.category?.name ?? '—',
            type:       p.type,
            variants:   p.variants.length,
            stock:      p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0),
            status:     p.status,
            raw:        p,
        }))
    }, [products])

    const columns: ColumnDef<Row>[] = [
        { key: 'product_id', label: 'ID',       width: '80px'   },
        { key: 'name',       label: 'Product'                   },
        { key: 'category',   label: 'Category'                  },
        { key: 'type',       label: 'Type'                      },
        { key: 'variants',   label: 'Variants', align: 'center' },
        { key: 'stock',      label: 'Stock',    align: 'right'  },
        {
            key: 'status',
            label: 'Status',
            render: (v) => {
                const { label, variant } = STATUS_BADGE[v as ProductStatus] ?? STATUS_BADGE.ACTIVE
                return <StatusBadge status={label} variant={variant} />
            },
        },
    ]

    return (
        <section className="min-h-screen bg-slate-50 px-6 py-10">
            <PageHeader
                eyebrow="Catalog"
                title="Products"
                subtitle="Manage your product inventory"
                actions={[
                    { label: 'Import',         onClick: () => {},            variant: 'secondary' },
                    { label: 'Create Product', onClick: () => setOpen(true), variant: 'primary'   },
                ]}
            />

            {deleteError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <p className="text-[12px] text-rose-700 font-medium">{deleteError}</p>
                </div>
            )}

            <AddProductDialog open={open} onClose={() => setOpen(false)} />

            <EditProductDialog
                product={editingProduct}
                open={!!editingProduct}
                onClose={() => setEditingProduct(null)}
            />

            <DeleteProductDialog
                open={!!deletingRow}
                productName={deletingRow?.name ?? ''}
                productId={deletingRow?.product_id ?? ''}
                onConfirm={handleDeleteConfirm}
                onOpenChange={(isOpen) => { if (!isOpen) setDeletingRow(null) }}
            />

            <DataTable<Row>
                data={rows}
                columns={columns}
                searchKeys={['name', 'category']}
                filterKey="status"
                filterOptions={['All', 'ACTIVE', 'DRAFT', 'HIDDEN', 'ARCHIVED']}
                defaultSortKey="name"
                getRowId={(row) => row.product_id}
                onDelete={(row) => setDeletingRow(row)}
                onEdit={(row) => setEditingProduct(row.raw)}
                expandedRowRender={(row) => {
                    const p = row.raw
                    return (
                        <div className="space-y-4 text-sm">
                            {p.description && (
                                <div>
                                    <h4 className="font-semibold text-slate-700">Description</h4>
                                    <p className="text-slate-600">{p.description}</p>
                                </div>
                            )}
                            {p.product_details.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-700">Details</h4>
                                    <ul className="list-disc ml-5 text-slate-600">
                                        {p.product_details.map((d, i) => (
                                            <li key={i}>{d.attribute_name}: {d.attribute_value}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <h4 className="font-semibold text-slate-700">Variants</h4>
                                <div className="space-y-2">
                                    {p.variants.map((v) => (
                                        <div key={v.variant_id} className="border rounded-lg p-3">
                                            <p><strong>SKU:</strong> {v.sku}</p>
                                            <p><strong>Price:</strong> {v.price}</p>
                                            <p><strong>Stock:</strong> {v.stock}</p>
                                            {v.attributes.length > 0 && (
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {v.attributes.map((a, i) => (
                                                        <span key={i}>{a.name}: {a.value} </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-xs text-slate-400">
                                Created: {new Date(p.created_at).toLocaleString()}
                            </div>
                        </div>
                    )
                }}
            />
        </section>
    )
}