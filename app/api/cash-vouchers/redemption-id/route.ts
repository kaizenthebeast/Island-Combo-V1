import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'
import type { CashVoucher } from '@/lib/types/cash-voucher'

// Matches a canonical UUID (v1–v5). Cheap pre-validation before hitting the DB.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/cash-vouchers/redemption-id
// Generate Id API: mints a cryptographically-unique redemption UUID and stores it
// on the voucher record. Authentication gives a clean 401 here; ownership (the
// caller must own the voucher, or be staff/admin) and the ACTIVE-only rule are
// enforced inside generate_cash_voucher_redemption_id(). The call is idempotent.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body = (await req.json().catch(() => null)) as { voucherId?: unknown } | null
    const voucherId = body?.voucherId

    if (typeof voucherId !== 'string' || !UUID_RE.test(voucherId)) {
      return apiError('A valid voucherId is required.', HTTP.BAD_REQUEST)
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('generate_cash_voucher_redemption_id', { p_voucher_id: voucherId })
      .single<CashVoucher>()

    if (error || !data) {
      return apiError(error?.message ?? 'Could not generate a redemption id.', HTTP.BAD_REQUEST)
    }

    return apiOk({
      data: { redemptionId: data.redemption_uuid, voucher: data },
      message: 'Redemption id ready.',
    })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
