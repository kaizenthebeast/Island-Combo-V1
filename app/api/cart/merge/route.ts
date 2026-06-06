import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { mergeGuestCart, getCartWithTotals } from '@/lib/cart'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

// Cart Merge (§3.3) — authenticated. Folds the guest cart (identified by the
// guestUserId from the just-ended anonymous session) into the user's cart,
// prioritising the user's saved quantities. Triggered on login / registration.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user || user.isAnonymous) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { guestUserId } = await req.json()
    if (!guestUserId) return apiError('guestUserId is required', HTTP.BAD_REQUEST)

    await mergeGuestCart(String(guestUserId), user.id)
    const data = await getCartWithTotals(user.id)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
