import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getMyOrdersPage } from '@/lib/orders/orders'
import OrdersListClient from './OrdersListClient'

// Customer Orders & tracking — the buyer's order history with status tabs,
// per-order tracking, and inline rating once an item is delivered.
const OrdersPage = async () => {
  const user = await requireUser()
  if (!user) redirect('/auth/login')

  const { rows } = await getMyOrdersPage({ page: 1, pageSize: 50 })
  return <OrdersListClient initialOrders={rows} />
}

export default OrdersPage
