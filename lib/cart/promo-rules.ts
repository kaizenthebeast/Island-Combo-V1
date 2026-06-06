/** Pure promo-code usability rules, shared by apply + Fetch-Cart recalculation. */

// The columns we read off `promo` to decide whether a code is usable right now.
export type PromoRow = {
  code: string
  value: number
  status: string
  expires_at: string | null
  min_quantity: number | null
  max_uses: number | null
  used_count: number
}

// Returns a user-facing reason the code can't be used, or null when it's valid.
// §3.9: a cart containing a digital product can never take a discount.
export function promoUnusableReason(
  promo: PromoRow,
  opts: { totalQty: number; hasDigital: boolean },
): string | null {
  if (opts.hasDigital) return 'Promo codes cannot be applied to a cart containing digital products'
  if (promo.status !== 'ACTIVE') return 'This promo code is not active'
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return 'This promo code has expired'
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) return 'This promo code has reached its usage limit'
  if (promo.min_quantity != null && opts.totalQty < promo.min_quantity)
    return `This promo code requires a minimum of ${promo.min_quantity} items`
  return null
}
