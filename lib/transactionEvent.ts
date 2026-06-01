'use server'

import { createClient } from '@/lib/supabase/server'
import type { TransactionEvent } from '@/types/transactionEvent'

// ─── READ: audit trail for a cash voucher ─────────────────────────────────────
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

// ─── READ: audit trail for an order ───────────────────────────────────────────
export const getOrderEvents = async (orderId: number): Promise<TransactionEvent[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_event')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as TransactionEvent[]
}
