/** Order-status presentation helpers (pure; safe for client or server). */
import type { OrderStatus } from '@/shared/types/order'
import type { BadgeVariant } from '@/components/admin/StatusBadge'

export const ORDER_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled',
]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending:          'Pending',
  paid:             'Paid',
  shipped:          'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered:        'Delivered',
  completed:        'Completed',
  cancelled:        'Cancelled',
}

export const orderStatusLabel = (status: string): string =>
  ORDER_STATUS_LABEL[status as OrderStatus] ?? status

export const orderStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'pending':          return 'warning'
    case 'paid':             return 'info'
    case 'shipped':          return 'info'
    case 'out_for_delivery': return 'info'
    case 'delivered':        return 'success'
    case 'completed':        return 'success'
    case 'cancelled':        return 'danger'
    default:                 return 'default'
  }
}
