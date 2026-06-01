import React from 'react'
import VoucherClient from './VoucherClient'
import { getVouchersPage, type VouchersSortKey } from '@/lib/admin/voucher'

type SearchParams = Promise<Record<string, string | undefined>>

const DEFAULT_PAGE_SIZE = 10

const VoucherPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams

  const page     = Number(params.page)     || 1
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE

  const { rows, total } = await getVouchersPage({
    page,
    pageSize,
    search:  params.search || undefined,
    filter:  params.filter || undefined,
    sortKey: (params.sortKey as VouchersSortKey) || 'created_at',
    sortDir: (params.sortDir as 'asc' | 'desc') || 'desc',
  })

  return (
    <VoucherClient
      voucher={rows}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  )
}

export default VoucherPage
