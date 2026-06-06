import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { linkMyLoyaltyCard } from '@/lib/loyalty/card'
import { getLoyaltyStatus } from '@/lib/loyalty/status'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

// POST /api/loyalty/card — "Retrieve my points": claim my Loyverse card. Credits
// the migrated balance and links the card to my account.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user || user.isAnonymous) return apiError('Please sign in to link a loyalty card.', HTTP.UNAUTHORIZED)

    const { cardNumber } = (await req.json()) ?? {}
    if (!cardNumber) return apiError('A loyalty card number is required.', HTTP.BAD_REQUEST)

    const claim = await linkMyLoyaltyCard(String(cardNumber))
    const status = await getLoyaltyStatus(user.id)
    return apiOk({
      data: status,
      message: claim.points > 0
        ? `${claim.points.toLocaleString()} points added to your balance.`
        : 'Loyalty card linked.',
    })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
