import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getMyNotificationPrefs, updateMyNotificationPrefs } from '@/lib/account/profile'
import { HTTP, apiOk, apiError, apiResult, toApiError } from '@/lib/api/respond'

// GET /api/profile/notifications
// Returns the signed-in user's email-notification opt-in flags.
export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const data = await getMyNotificationPrefs(user.id)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/profile/notifications
// Body: { order_updates?: boolean, promotions?: boolean }
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body = (await req.json()) ?? {}
    const { order_updates, promotions } = body

    if (order_updates !== undefined && typeof order_updates !== 'boolean') {
      return apiError('order_updates must be a boolean', HTTP.BAD_REQUEST)
    }
    if (promotions !== undefined && typeof promotions !== 'boolean') {
      return apiError('promotions must be a boolean', HTTP.BAD_REQUEST)
    }

    const result = await updateMyNotificationPrefs(user.id, { order_updates, promotions })
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}
