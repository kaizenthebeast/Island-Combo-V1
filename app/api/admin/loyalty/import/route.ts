import { NextRequest } from 'next/server'
import { importLoyverseCards, type LoyverseCardEntry } from '@/features/loyalty/api/admin'
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'

// POST /api/admin/loyalty/import — migrate existing Loyverse cards (§3.8).
// Body: { entries: [{ cardNumber, points, name?, email? }] }. Bulk-upserts into
// the staging table; customers claim their card later. Admin-only (lib + RLS).
export async function POST(req: NextRequest) {
  try {
    const { entries } = (await req.json()) ?? {}
    if (!Array.isArray(entries)) {
      return apiError('entries[] is required', HTTP.BAD_REQUEST)
    }
    return apiResult(await importLoyverseCards(entries as LoyverseCardEntry[]))
  } catch (error: unknown) {
    return toApiError(error)
  }
}
