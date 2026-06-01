import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { findPromoCode } from '@/lib/checkout'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized access', HTTP.UNAUTHORIZED)

    const { promoCode, existingPromo } = await req.json()

    if (!promoCode)    return apiError('Promo code is required',         HTTP.BAD_REQUEST)
    if (existingPromo) return apiError('Only one promo code can be applied', HTTP.BAD_REQUEST)

    const promo = await findPromoCode(promoCode)
    if (!promo) return apiError('Invalid or expired promo code', HTTP.BAD_REQUEST)

    return apiOk({ data: { promo } })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
