import React from 'react'
import ProductsClient from './ProductsClient'
import { getAdminProductsPage, type AdminProductsPageInput } from '@/lib/admin/product'

type SearchParams = Promise<Record<string, string | undefined>>

const DEFAULT_PAGE_SIZE = 10

const AdminProductPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams

  const input: AdminProductsPageInput = {
    page:     Number(params.page) || 1,
    pageSize: Number(params.pageSize) || DEFAULT_PAGE_SIZE,
    search:   params.search || undefined,
    status:   params.filter || undefined,
    sortKey:  (params.sortKey as AdminProductsPageInput['sortKey']) || 'created_at',
    sortDir:  (params.sortDir as AdminProductsPageInput['sortDir']) || 'desc',
  }

  const { rows, total } = await getAdminProductsPage(input)

  return (
    <ProductsClient
      products={rows}
      total={total}
      page={input.page}
      pageSize={input.pageSize}
    />
  )
}

export default AdminProductPage
