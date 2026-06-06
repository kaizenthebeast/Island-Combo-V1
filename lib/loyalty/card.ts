/** Customer self-service: claim my pre-existing in-store card + points (§3.8).
 *  The member enters their legacy Island Combo (Loyverse) card number; the
 *  claim_loyverse_card RPC atomically credits the migrated balance, links the
 *  card to my profile, and marks the card claimed (so it can't be claimed twice).
 *  It does NOT touch my permanent system loyalty_card_number. */
import { createClient } from '@/lib/supabase/server'
import { AppError, HTTP } from '@/lib/api/respond'

const ERRCODE_STATUS: Record<string, number> = {
  '28000': HTTP.UNAUTHORIZED,
  '22023': HTTP.BAD_REQUEST,
  'P0002': HTTP.NOT_FOUND,   // no card with that number
  'P0001': HTTP.CONFLICT,    // already claimed / already linked
}

export const linkMyLoyaltyCard = async (
  cardNumber: string,
): Promise<{ points: number; cardNumber: string }> => {
  const code = (cardNumber ?? '').trim()
  if (!code) throw new AppError('A loyalty card number is required.', HTTP.BAD_REQUEST)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('claim_loyverse_card', { p_card_number: code })

  if (error) {
    throw new AppError(error.message, ERRCODE_STATUS[error.code] ?? HTTP.INTERNAL)
  }

  const result = data as { points: number; card_number: string }
  return { points: result?.points ?? 0, cardNumber: result?.card_number ?? code }
}
