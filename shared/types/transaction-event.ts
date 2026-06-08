/** Shared transaction-event (audit) types. */
// One row of public.transaction_event — the shared, append-only audit log for
// any purchase. Exactly one of order_id / cash_voucher_id is set.
export type TransactionEventSource = 'client' | 'staff' | 'webhook' | 'system'

export type TransactionEvent = {
  id: string
  order_id: number | null
  cash_voucher_id: string | null
  status: string
  note: string | null
  actor_id: string | null
  actor_name?: string | null   // resolved staff/admin name (audit display); null for customers/system
  source: TransactionEventSource
  metadata: Record<string, unknown> | null
  created_at: string
}
