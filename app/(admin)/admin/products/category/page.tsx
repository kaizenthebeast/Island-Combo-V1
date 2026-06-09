import React from 'react'
import CategoryClient from './CategoryClient'
import { getAllParentCategories } from '@/features/categories/api/category'
import { getCategoriesPage, type CategoriesSortKey } from '@/lib/admin/categories/category'

type SearchParams = Promise<Record<string, string | undefined>>

const DEFAULT_PAGE_SIZE = 10

const AdminCategoryPage = async ({ searchParams }: { searchParams: SearchParams }) => {
    const params = await searchParams

    const page     = Number(params.page)     || 1
    const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE

    const [{ parents, children, total }, allParents] = await Promise.all([
        getCategoriesPage({
            page,
            pageSize,
            search:  params.search || undefined,
            filter:  params.filter || undefined,
            sortKey: (params.sortKey as CategoriesSortKey) || 'name',
            sortDir: (params.sortDir as 'asc' | 'desc') || 'asc',
        }),
        getAllParentCategories(),
    ])

    return (
        <CategoryClient
            parents={parents}
            childrenRows={children}
            allParentOptions={allParents.map((p) => ({ category_id: p.category_id, name: p.name }))}
            total={total}
            page={page}
            pageSize={pageSize}
        />
    )
}

export default AdminCategoryPage
