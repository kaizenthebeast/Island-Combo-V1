import { requireUser } from '@/lib/auth'
import { getLoyaltyHistory } from '@/lib/loyalty/history'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// GET /api/loyalty/history — the signed-in user's points earn/redeem ledger.
export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const data = await getLoyaltyHistory(user.id)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
