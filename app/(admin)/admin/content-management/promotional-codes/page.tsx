import React from 'react'
import PromoCodeClient from './PromoCodeClient'
import { getPromoCodesPage, type PromoCodesSortKey } from '@/features/promotions/api/admin/promo-code'

type SearchParams = Promise<Record<string, string | undefined>>

const DEFAULT_PAGE_SIZE = 10

const PromoCodePage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams

  const page     = Number(params.page)     || 1
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE

  const { rows, total } = await getPromoCodesPage({
    page,
    pageSize,
    search:  params.search || undefined,
    filter:  params.filter || undefined,
    sortKey: (params.sortKey as PromoCodesSortKey) || 'created_at',
    sortDir: (params.sortDir as 'asc' | 'desc') || 'desc',
  })

  return (
    <PromoCodeClient
      promoCodes={rows}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  )
}

export default PromoCodePage
