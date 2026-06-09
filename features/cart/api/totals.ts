/** Pure, server-side cart total calculation (§3.3 Fetch Cart / §3.9 pricing). */
import type { CartItem, CartTotals } from '@/shared/types/cart'
import { pointsToCash } from './loyalty-config'

export const round2 = (n: number) => Math.round(n * 100) / 100

// The trusted unit price for a line: the tier-resolved price from cart_view,
// falling back the same way the cart UI does.
export const unitPriceOf = (item: CartItem) =>
  item.applied_price || item.final_price || item.price

export function computeCartTotals({
  items,
  promo,
  pointsRedeemed,
}: {
  items: CartItem[]
  promo: { code: string; value: number } | null
  pointsRedeemed: number
}): CartTotals {
  const subtotal = round2(items.reduce((sum, i) => sum + unitPriceOf(i) * i.quantity, 0))

  const promoDiscount = promo ? round2((subtotal * promo.value) / 100) : 0

  // Points redemption is capped so the order total can never go negative.
  const pointsCash = pointsToCash(pointsRedeemed)
  const pointsDiscount = round2(Math.min(pointsCash, Math.max(0, subtotal - promoDiscount)))

  const total = round2(Math.max(0, subtotal - promoDiscount - pointsDiscount))

  return {
    subtotal,
    promoCode: promo?.code ?? null,
    promoValue: promo?.value ?? null,
    promoDiscount,
    pointsRedeemed,
    pointsDiscount,
    total,
  }
}
