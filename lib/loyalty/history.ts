/** Loyalty points history — the caller's earn/redeem ledger (§3.8). RLS scopes
 *  profile_pts_transaction_records to the owner; the caller passes their userId. */
import { createClient } from '@/lib/supabase/server'

export type LoyaltyHistoryEntry = {
  id: number
  points: number          // positive = earned, negative = redeemed
  reason: string
  order_id: number | null
  created_at: string
  kind: 'earned' | 'redeemed'
}

export const getLoyaltyHistory = async (userId: string): Promise<LoyaltyHistoryEntry[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profile_pts_transaction_records')
    .select('id, points, reason, order_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id,
    points: r.points,
    reason: r.reason,
    order_id: r.order_id,
    created_at: r.created_at,
    kind: r.points >= 0 ? ('earned' as const) : ('redeemed' as const),
  }))
}
