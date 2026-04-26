'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/admin/Pageheader'
import AddProductDialog from '@/components/admin/products/AddProductDialog'

export default function ProductsClient({ products }: { products: any[] }) {
    const [open, setOpen] = useState(false)

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
        </section>
    )
}