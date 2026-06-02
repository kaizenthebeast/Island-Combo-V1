import { NextRequest } from 'next/server'
import { getMyAccount, updateMyAccount } from '@/lib/account/profile'
import { HTTP, apiOk, apiError, apiResult, toApiError } from '@/lib/api/respond'

// GET /api/profile — authenticated aggregator
// Returns identity + role + loyalty + default address for the signed-in user.
export async function GET() {
  try {
    const data = await getMyAccount()
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/profile — self-update (no role, no email, no address)
// Accepts any subset of: first_name, last_name, phone_text, sex, age.
// Email changes belong to a separate, more sensitive auth flow.
// Role changes go through /api/users (admin only).
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) ?? {}
    const { first_name, last_name, phone_text, sex, age } = body

    if (sex !== undefined && sex !== null && sex !== 'Male' && sex !== 'Female') {
      return apiError("sex must be 'Male', 'Female', or null", HTTP.BAD_REQUEST)
    }
    if (age !== undefined && age !== null && (typeof age !== 'number' || age < 0 || !Number.isInteger(age))) {
      return apiError('age must be a non-negative integer', HTTP.BAD_REQUEST)
    }

    const result = await updateMyAccount({ first_name, last_name, phone_text, sex, age })
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}
