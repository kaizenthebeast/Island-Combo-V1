import { requireUser } from '@/features/auth/api'
import { getLoyaltyStatus } from '@/features/loyalty/api/status'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// GET /api/loyalty — Loyalty Status & Balance API (§3.8)
// Returns the signed-in user's points balance, its cash value, and has_perks.
export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const data = await getLoyaltyStatus(user.id)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
