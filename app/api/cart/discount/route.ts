import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { applyCartDiscount, removeCartDiscount, getCartWithTotals } from '@/lib/cart'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

// Apply Discount Code (§3.3). Unauthenticated guests use their anonymous
// session; the code is validated against the real cart and saved to the header.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { code } = await req.json()
    if (!code) return apiError('Promo code is required', HTTP.BAD_REQUEST)

    const promo = await applyCartDiscount(user.id, String(code))
    const { totals } = await getCartWithTotals(user.id)
    return apiOk({ data: { promo, totals } })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// Remove Discount Code (§3.3) — clears the code and recalculates.
export async function DELETE() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    await removeCartDiscount(user.id)
    const { totals } = await getCartWithTotals(user.id)
    return apiOk({ data: { promo: null, totals } })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
