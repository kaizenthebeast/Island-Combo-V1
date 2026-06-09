import Link from 'next/link'
import { getOrderDetail } from '@/features/orders/api/admin'
import OrderDetailClient from './OrderDetailClient'

type Params = Promise<{ id: string }>

const AdminOrderDetailPage = async ({ params }: { params: Params }) => {
  const { id: orderId } = await params
  const id = Number(orderId)

  const result = await getOrderDetail(id)

  if (!result.success) {
    return (
      <div className="min-h-full bg-muted px-6 py-10">
        <Link href="/admin/orders" className="text-sm text-brand hover:underline">
          ← Back to orders
        </Link>
        <p className="mt-4 text-danger">Failed to load order #{orderId}: {result.message}</p>
      </div>
    )
  }

  return (
    <OrderDetailClient
      detail={result.detail}
      timeline={result.timeline}
    />
  )
}

export default AdminOrderDetailPage
