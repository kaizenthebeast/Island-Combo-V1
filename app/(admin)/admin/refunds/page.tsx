import { getRefunds } from '@/lib/admin/refunds'
import RefundsClient from './RefundsClient'
import type { RefundStatus } from '@/types/refund'

type SearchParams = Promise<Record<string, string | undefined>>

const VALID = ['pending', 'refunded', 'rejected', 'all'] as const

// Admin Refunds queue — validate customer cancellation/refund requests before
// the PayPal refund is issued. The status filter drives an SSR re-fetch through
// the ?status URL param (server fetch — faster than a client round-trip).
const RefundsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams
  const status = (VALID.includes(params.status as never) ? params.status : 'pending') as RefundStatus | 'all'

  const res = await getRefunds(status)
  return <RefundsClient rows={res.success ? res.rows : []} status={status} />
}

export default RefundsPage
