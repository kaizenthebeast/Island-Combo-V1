import { NextRequest } from 'next/server'
import { validateCashVoucher } from '@/features/cash-vouchers/api/admin'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// POST /api/cash-vouchers/validate   Body: { code: string }
//
// Staff/admin only (send `Authorization: Bearer <staff access token>`).
// Read-only check of a scanned value — `code` may be the redemption UUID (what
// the QR encodes) or the display code (CV-YYYY-…, typed at the counter). Returns
// whether the voucher exists and is currently redeemable. Never mutates, so a
// scanner app can call it freely.
//
// 200 → { valid, status, reason, voucher? }
//   valid:  true only when status === 'ACTIVE'
//   reason: OK | NOT_FOUND | ALREADY_REDEEMED | EXPIRED | CANCELLED
// 400 (no code) · 401 (no/invalid token) · 403 (not staff)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { code?: unknown } | null
    const code = body?.code

    if (typeof code !== 'string' || !code.trim()) {
      return apiError('A voucher code is required.', HTTP.BAD_REQUEST)
    }

    const result = await validateCashVoucher(code)
    if (!result.success) return apiError(result.message, result.status)

    return apiOk({ data: result.data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
