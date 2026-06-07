import { getRefunds } from '@/lib/admin/refunds'
import RefundsClient from './RefundsClient'

// Admin Refunds queue — validate customer cancellation/refund requests before
// the PayPal refund is issued.
const RefundsPage = async () => {
  const res = await getRefunds('pending')
  return <RefundsClient initialRows={res.success ? res.rows : []} />
}

export default RefundsPage
