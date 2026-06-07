/** Apply / Remove Discount Code (§3.3), persisted to the cart header. */
import { createClient } from '@/lib/supabase/server'
import { AppError, HTTP } from '@/lib/api/respond'
import { loadCartFacts } from './cart'
import { promoUnusableReason, type PromoRow } from './promo-rules'

// Validates a promo code against the caller's actual cart (existence, ACTIVE
// status, expiry, usage limit, min-quantity) and, when valid, saves it to
// cart_meta for Fetch Cart to recalculate from.
export const applyCartDiscount = async (userId: string, code: string) => {
  const trimmed = (code ?? '').trim()
  if (!trimmed) throw new AppError('Promo code is required', HTTP.BAD_REQUEST)

  const supabase = await createClient()
  const facts = await loadCartFacts(userId)

  const { data: promo, error } = await supabase
    .from('promo')
    .select('code, value, status, expires_at, min_quantity, max_uses, used_count')
    .eq('code', trimmed.toUpperCase())
    .maybeSingle<PromoRow>()

  if (error) throw new AppError(error.message, HTTP.INTERNAL)
  if (!promo) throw new AppError('Promo code not found', HTTP.NOT_FOUND)

  const reason = promoUnusableReason(promo, { totalQty: facts.totalQty })
  if (reason) throw new AppError(reason, HTTP.BAD_REQUEST)

  const { error: upErr } = await supabase
    .from('cart_meta')
    .upsert(
      { user_id: userId, promo_code: promo.code, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (upErr) throw new AppError(upErr.message, HTTP.INTERNAL)

  return { code: promo.code, value: Number(promo.value) }
}

// Removes the applied promo from the cart header; Fetch Cart then recalculates.
export const removeCartDiscount = async (userId: string) => {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cart_meta')
    .update({ promo_code: null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw new AppError(error.message, HTTP.INTERNAL)
}
