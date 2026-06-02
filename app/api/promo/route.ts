import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { applyVoucher } from '@/lib/promo-vouchers/apply-voucher'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized access', HTTP.UNAUTHORIZED)

    const { promoCode, totalQty, existingPromo } = await req.json()

    if (!promoCode) return apiError('Promo code is required', HTTP.BAD_REQUEST)
    if (existingPromo) return apiError('Only one promo code can be applied', HTTP.BAD_REQUEST)

    const result = await applyVoucher(promoCode, Number(totalQty) || 0)
    if (!result.success)
      return apiError(result.message ?? 'Invalid or expired promo code', HTTP.BAD_REQUEST)

    return apiOk({ data: { promo: result.voucher } })
  } catch (error: unknown) {
    return toApiError(error)
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized access', HTTP.UNAUTHORIZED)
    return apiOk({ data: { promo: null } })

  } catch (error: unknown) {
    return toApiError(error)
  }

}