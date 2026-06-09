import { NextRequest } from 'next/server'
import { generateRedemptionId } from '@/features/cash-vouchers/api/cash-voucher'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// Matches a canonical UUID (v1–v5). Cheap pre-validation before hitting the DB.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/cash-vouchers/redemption-id
// Thin route: validates the voucherId, then delegates to lib. Auth (clean 401)
// and ownership/ACTIVE-only enforcement live in the lib + the RPC.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { voucherId?: unknown } | null
    const voucherId = body?.voucherId

    if (typeof voucherId !== 'string' || !UUID_RE.test(voucherId)) {
      return apiError('A valid voucherId is required.', HTTP.BAD_REQUEST)
    }

    const result = await generateRedemptionId(voucherId)
    if (!result.success) return apiError(result.message, result.status)

    return apiOk({
      data: { redemptionId: result.redemptionId, voucher: result.voucher },
      message: 'Redemption id ready.',
    })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
