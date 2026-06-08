'use client'

import { useState, useMemo, useTransition } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddProductDialog from '@/components/admin/products/AddProductDialog'
import EditProductDialog from '@/components/admin/products/EditProductDialog'
import DeleteProductDialog from '@/components/admin/products/DeleteProductDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import type { AdminProduct, ProductStatus } from '@/types/product'
import { softDeleteProduct } from '@/lib/admin/products/product'

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

interface Props {
    products: AdminProduct[]
    total: number
    page: number
    pageSize: number
}

export default function ProductsClient({ products, total, page, pageSize }: Props) {
    const [open, setOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
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
        sortKey: 'created_at',
        sortDir: 'desc',
    })

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
        return products.map((product) => ({
            product_id: product.product_id,
            name:       product.name,
            category:   product.category?.name ?? '—',
            type:       product.type,
            variants:   product.variants.length,
            stock:      product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0),
            status:     product.status,
            raw:        product,
        }))
    }, [products])

    const columns: ColumnDef<Row>[] = [
        { key: 'product_id', label: 'ID',       width: '80px'                    },
        { key: 'name',       label: 'Product'                                    },
        { key: 'category',   label: 'Category', sortable: false                  },
        { key: 'type',       label: 'Type'                                       },
        { key: 'variants',   label: 'Variants', align: 'center', sortable: false },
        { key: 'stock',      label: 'Stock',    align: 'right',  sortable: false },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                const { label, variant } = STATUS_BADGE[value as ProductStatus] ?? STATUS_BADGE.ACTIVE
                return <StatusBadge status={label} variant={variant} />
            },
        },
    ]

    return (
        <section className="min-h-full bg-muted px-6 py-10">
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
                <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
                    <p className="text-[12px] text-danger font-medium">{deleteError}</p>
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
                searchPlaceholder="Search products by name…"

                filterValue={state.filter || 'All'}
                onFilterChange={setFilter}
                filterOptions={['All', 'ACTIVE', 'DRAFT', 'HIDDEN', 'ARCHIVED']}

                sortKey={state.sortKey as keyof Row | undefined}
                sortDir={state.sortDir}
                onSortChange={(key, dir) => setSort(String(key), dir)}

                getRowId={(row) => row.product_id}
                onDelete={(row) => setDeletingRow(row)}
                onEdit={(row) => setEditingProduct(row.raw)}
                expandedRowRender={(row) => {
                    const product = row.raw
                    return (
                        <div className="space-y-4 text-sm">
                            {product.description && (
                                <div>
                                    <h4 className="font-semibold text-foreground">Description</h4>
                                    <p className="text-muted-foreground">{product.description}</p>
                                </div>
                            )}
                            {product.product_details.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-foreground">Details</h4>
                                    <ul className="list-disc ml-5 text-muted-foreground">
                                        {product.product_details.map((detail, index) => (
                                            <li key={index}>{detail.attribute_name}: {detail.attribute_value}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <h4 className="font-semibold text-foreground">Variants</h4>
                                <div className="space-y-2">
                                    {product.variants.map((variant) => (
                                        <div key={variant.variant_id} className="border rounded-lg p-3">
                                            <p><strong>SKU:</strong> {variant.sku}</p>
                                            <p><strong>Price:</strong> {variant.price}</p>
                                            <p><strong>Stock:</strong> {variant.stock}</p>
                                            {variant.attributes.length > 0 && (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {variant.attributes.map((attr, index) => (
                                                        <span key={index}>{attr.name}: {attr.value} </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Created: {new Date(product.created_at).toLocaleString()}
                            </div>
                        </div>
                    )
                }}
            />
        </section>
    )
}
