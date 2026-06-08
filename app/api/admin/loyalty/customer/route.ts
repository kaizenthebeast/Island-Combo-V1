import { NextRequest } from 'next/server'
import { findCustomerByEmail } from '@/lib/admin/loyalty'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// GET /api/admin/loyalty/customer?email= — Admin Customer Search (Flow D).
// Returns the matched customer (or null) with their card + verified status.
export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get('email') ?? ''
    if (!email) return apiError('email is required', HTTP.BAD_REQUEST)

    const result = await findCustomerByEmail(email)
    if (!result.success) return apiError(result.message, result.status)
    return apiOk({ data: result.customer })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
