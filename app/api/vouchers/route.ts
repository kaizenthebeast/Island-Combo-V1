import { requireUser } from '@/lib/auth'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'
import { getMyCashVouchers } from '@/features/cash-vouchers/api/cash-voucher'

// GET /api/vouchers
// Fetch Voucher History: the caller's purchased digital products (cash
// vouchers) with Voucher ID, Value, Purchase Date and Status (ACTIVE /
// REDEEMED / EXPIRED). Reuses the existing owner-scoped read (RLS restricts
// rows to the purchaser).
export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const vouchers = await getMyCashVouchers()
    return apiOk({ data: vouchers })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
