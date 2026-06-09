'use server'
/** Read transaction (audit) events for orders & vouchers. */

import { createClient } from '@/shared/lib/db/server'
import type { TransactionEvent } from '@/shared/types/transaction-event'

// Chronological audit trail for a cash voucher.
export const getCashVoucherEvents = async (
  cashVoucherId: string,
): Promise<TransactionEvent[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_event')
    .select('*')
    .eq('cash_voucher_id', cashVoucherId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as TransactionEvent[]
}

// Chronological audit trail for an order, with each event's acting staff/admin
// resolved to a name (for the audit display). Profile RLS scopes the name lookup:
// admins resolve everyone; a customer only resolves themselves (staff names stay
// null for them), so this is safe to share between the admin and customer views.
export const getOrderEvents = async (orderId: number): Promise<TransactionEvent[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_event')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  const events = (data ?? []) as TransactionEvent[]

  const actorIds = [...new Set(events.map((e) => e.actor_id).filter((id): id is string => !!id))]
  if (actorIds.length === 0) return events

  const { data: profiles } = await supabase
    .from('profile')
    .select('user_id, first_name, last_name, email')
    .in('user_id', actorIds)

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || null,
    ]),
  )

  return events.map((e) => ({
    ...e,
    actor_name: e.actor_id ? nameById.get(e.actor_id) ?? null : null,
  }))
}
