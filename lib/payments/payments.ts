'use server'
/** Payment reads for an order. RLS scopes rows to the order's owner (or staff),
 *  so a non-owned order id simply returns nothing. */

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import type { Payment } from '@/types/payment'

export const getOrderPayments = async (orderId: number): Promise<Payment[]> => {
  const user = await requireUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Payment[]
}
