'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import { DataTable, ColumnDef } from '@/components/admin/DataTable'
import AddProductDialog from '@/components/admin/products/AddProductDialog'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import type { AdminProduct } from '@/types/product'

type Row = {
    product_id: number
    name: string
    category: string
    variants: number
    stock: number
    status: string
    raw: AdminProduct
}

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'Active':
            return 'success'
        case 'Inactive':
            return 'default'
        default:
            return 'default'
    }
}

export default function ProductsClient({ products }: { products: AdminProduct[] }) {
    const [open, setOpen] = useState(false)

    const rows: Row[] = useMemo(() => {
        return products.map((p) => ({
            product_id: p.product_id,
            name: p.name,
            category: p.category?.name ?? '—',
            variants: p.variants.length,
            stock: p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0),
            status: p.is_active ? 'Active' : 'Inactive',

            raw: p,
        }))
    }, [products])


    const columns: ColumnDef<Row>[] = [
        { key: 'product_id', label: 'ID', width: '80px' },
        { key: 'name', label: 'Product' },
        { key: 'category', label: 'Category' },
        {
            key: 'variants',
            label: 'Variants',
            align: 'center',
        },
        {
            key: 'stock',
            label: 'Stock',
            align: 'right',
        },
        {
            key: 'status',
            label: 'Status',
            render: (v) => (
                <StatusBadge
                    status={String(v)}
                    variant={getStatusVariant(String(v))}
                />
            ),
        },
    ]

    return (
        <section className="min-h-screen bg-slate-50 px-6 py-10">
            <PageHeader
                eyebrow="Catalog"
                title="Products"
                subtitle="Manage your product inventory"
                actions={[
                    { label: 'Export', onClick: () => { }, variant: 'secondary' },
                    { label: 'Import', onClick: () => { }, variant: 'secondary' },
                    { label: 'Add Product', onClick: () => setOpen(true), variant: 'primary' },
                ]}
            />

            <AddProductDialog open={open} onClose={() => setOpen(false)} />

            <DataTable<Row>
                data={rows}
                columns={columns}
                searchKeys={['name', 'category']}
                filterKey="status"
                filterOptions={['All', 'Active', 'Inactive']}
                defaultSortKey="name"
                getRowId={(row) => row.product_id}
                onDelete={(row) => {
                    console.log('delete product:', row.product_id)
                }}
                expandedRowRender={(row) => {
                    const p = row.raw

                    return (
                        <div className="space-y-4 text-sm">

                            {/* DESCRIPTION */}
                            {p.description && (
                                <div>
                                    <h4 className="font-semibold text-slate-700">Description</h4>
                                    <p className="text-slate-600">{p.description}</p>
                                </div>
                            )}

                            {/* DETAILS */}
                            {p.product_details.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-700">Details</h4>
                                    <ul className="list-disc ml-5 text-slate-600">
                                        {p.product_details.map((d, i) => (
                                            <li key={i}>
                                                {d.attribute_name}: {d.attribute_value}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* VARIANTS */}
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
                                                        <span key={i}>
                                                            {a.name}: {a.value}{' '}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* META */}
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