/** Loyalty Status & Balance (§3.8). Pure data-access: the caller passes the
 *  authenticated userId (derived from the JWT at the route boundary); RLS on
 *  profile_pts / profile enforces the ownership boundary. */
import { createClient } from '@/lib/supabase/server'
import { pointsToCash } from '@/features/cart/api/loyalty-config'

export type LoyaltyStatus = {
  points: number             // accumulated balance (profile_pts.total_pts)
  cashValue: number          // dollar value of the balance (100 pts = $1)
  cardNumber: string | null  // the member's permanent loyalty card number
  hasPerks: boolean          // a card is LINKED/activated → loyalty-only sales / early access
}

export const getLoyaltyStatus = async (userId: string): Promise<LoyaltyStatus> => {
  const supabase = await createClient()

  const [{ data: pts }, { data: profile }] = await Promise.all([
    supabase.from('profile_pts').select('total_pts').eq('user_id', userId).maybeSingle(),
    supabase.from('profile').select('loyalty_card_number, loyalty_card_linked_at').eq('user_id', userId).maybeSingle(),
  ])

  const points = pts?.total_pts ?? 0
  return {
    points,
    cashValue: pointsToCash(points),
    cardNumber: profile?.loyalty_card_number ?? null,
    hasPerks: !!profile?.loyalty_card_linked_at,
  }
}
