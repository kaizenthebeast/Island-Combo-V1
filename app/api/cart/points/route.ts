import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { applyCartPoints, removeCartPoints, getCartWithTotals } from '@/lib/cart'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

// Apply Points (§3.3) — authenticated, non-anonymous only. Reserves loyalty
// points as a cash discount on the cart; balance/min/max/digital are validated.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { points } = await req.json()
    const amount = Number(points)
    if (!Number.isFinite(amount)) return apiError('points is required', HTTP.BAD_REQUEST)

    const redemption = await applyCartPoints(user.id, amount, { isAnonymous: user.isAnonymous })
    const { totals } = await getCartWithTotals(user.id)
    return apiOk({ data: { points: redemption, totals } })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// Remove Points (§3.3) — releases the reservation and recalculates.
export async function DELETE() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const result = await removeCartPoints(user.id)
    const { totals } = await getCartWithTotals(user.id)
    return apiOk({ data: { points: result, totals } })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
