/** Apply / Remove Points (§3.3), held as a reservation on the cart header. */
import { createClient } from '@/lib/supabase/server'
import { AppError, HTTP } from '@/lib/api/respond'
import { loadCartFacts } from './cart'
import { MIN_REDEEM_POINTS, maxRedeemablePoints, pointsToCash } from './loyalty-config'

// Reserves `points` worth of loyalty redemption against the cart. Validates
// balance, the minimum threshold, the subtotal cap and the digital exclusion.
// The true balance is not debited here — only at checkout (see migration 0014).
export const applyCartPoints = async (
  userId: string,
  points: number,
  opts: { isAnonymous: boolean },
) => {
  if (opts.isAnonymous) throw new AppError('You must be signed in to redeem points', HTTP.UNAUTHORIZED)
  if (!Number.isInteger(points) || points <= 0)
    throw new AppError('A positive number of points is required', HTTP.BAD_REQUEST)
  if (points < MIN_REDEEM_POINTS)
    throw new AppError(`Minimum redemption is ${MIN_REDEEM_POINTS} points`, HTTP.BAD_REQUEST)

  const supabase = await createClient()
  const facts = await loadCartFacts(userId)

  if (facts.subtotal <= 0) throw new AppError('Your cart is empty', HTTP.BAD_REQUEST)

  const { data: pts, error } = await supabase
    .from('profile_pts')
    .select('total_pts')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new AppError(error.message, HTTP.INTERNAL)

  const balance = pts?.total_pts ?? 0
  if (points > balance)
    throw new AppError(`Insufficient points balance (have ${balance}, requested ${points})`, HTTP.BAD_REQUEST)

  const maxPts = maxRedeemablePoints(facts.subtotal)
  if (points > maxPts)
    throw new AppError(`You can redeem at most ${maxPts} points on this cart`, HTTP.BAD_REQUEST)

  const { error: upErr } = await supabase
    .from('cart_meta')
    .upsert(
      { user_id: userId, points_redeemed: points, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (upErr) throw new AppError(upErr.message, HTTP.INTERNAL)

  return { points, cashValue: pointsToCash(points) }
}

// Clears the points reservation; availability is immediately restored.
export const removeCartPoints = async (userId: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cart_meta')
    .select('points_redeemed')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new AppError(error.message, HTTP.INTERNAL)

  const restored = data?.points_redeemed ?? 0

  const { error: upErr } = await supabase
    .from('cart_meta')
    .update({ points_redeemed: 0, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (upErr) throw new AppError(upErr.message, HTTP.INTERNAL)

  return { restored }
}
