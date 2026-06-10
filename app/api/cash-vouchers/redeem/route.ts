import { NextRequest } from 'next/server'
import { redeemCashVoucher } from '@/features/cash-vouchers/api/admin'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// POST /api/cash-vouchers/redeem   Body: { code: string, redeemerName: string }
//
// Staff/admin only (send `Authorization: Bearer <staff access token>`).
// Atomically flips an ACTIVE voucher to REDEEMED and records who released the
// cash. The DB RPC is the source of truth: staff check, status check, and a
// single-redeem guard (a second concurrent redeem loses the race) all live there.
//
// 200 → { data: <redeemed voucher>, message }
// 400 (missing fields) · 401 (no/invalid token) · 403 (not staff)
// 404 (code not found) · 409 (already redeemed / not ACTIVE / lost the race)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { code?: unknown; redeemerName?: unknown }
      | null

    const code = body?.code
    const redeemerName = body?.redeemerName

    if (typeof code !== 'string' || !code.trim()) {
      return apiError('A voucher code is required.', HTTP.BAD_REQUEST)
    }
    if (typeof redeemerName !== 'string' || !redeemerName.trim()) {
      return apiError('redeemerName is required (the person collecting the cash).', HTTP.BAD_REQUEST)
    }

    const result = await redeemCashVoucher(code, redeemerName)
    if (!result.success) {
      return apiError(result.message ?? 'Could not redeem the voucher.', result.status ?? HTTP.BAD_REQUEST)
    }

    return apiOk({ data: result.voucher, message: 'Voucher redeemed.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
