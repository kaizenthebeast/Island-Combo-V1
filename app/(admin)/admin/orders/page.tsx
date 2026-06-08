import OrdersClient from './OrdersClient'
import { getOrdersPage, type OrdersSortKey } from '@/lib/admin/orders'
import type { AdminOrderListRow } from '@/types/order'

type SearchParams = Promise<Record<string, string | undefined>>

const DEFAULT_PAGE_SIZE = 10

const AdminOrdersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams

  const page     = Number(params.page)     || 1
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE

  const result = await getOrdersPage({
    page,
    pageSize,
    search:  params.search || undefined,
    filter:  params.filter || undefined,   // order status
    payment: params.payment || undefined,  // payment method
    sortKey: (params.sortKey as OrdersSortKey) || 'created_at',
    sortDir: (params.sortDir as 'asc' | 'desc') || 'desc',
  })

  if (!result.success) {
    return (
      <div className="p-8 text-danger">
        Failed to load orders: {result.message}
      </div>
    )
  }

  return (
    <OrdersClient
      orders={result.rows as AdminOrderListRow[]}
      total={result.total}
      page={page}
      pageSize={pageSize}
      payment={params.payment || 'All'}
    />
  )
}

export default AdminOrdersPage
