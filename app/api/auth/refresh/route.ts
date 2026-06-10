import { NextRequest } from 'next/server'
import { refreshAccessToken } from '@/features/auth/api'
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'

// POST /api/auth/refresh — renew the Bearer access token.
// Body: { refreshToken: string }  (the refreshToken from /api/auth/login)
// Returns a fresh { accessToken, refreshToken, expiresAt, tokenType }.
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json().catch(() => ({}))
    if (!refreshToken || typeof refreshToken !== 'string') {
      return apiError('refreshToken is required', HTTP.BAD_REQUEST)
    }

    const result = await refreshAccessToken(refreshToken)
    if (!result.success) return apiError(result.message, result.status)

    return apiResult({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
      tokenType: result.tokenType,
    })
  } catch (error) {
    return toApiError(error)
  }
}
