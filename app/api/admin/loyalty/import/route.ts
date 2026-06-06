import { NextRequest } from 'next/server'
import { importLoyaltyPoints, type LoyverseImportEntry } from '@/lib/admin/loyalty'
import { HTTP, apiError, apiResult, toApiError } from '@/lib/api/respond'

// POST /api/admin/loyalty/import — Loyverse points migration (§3.8)
// Body: { entries: [{ cardNumber?|email?, points }] }. Idempotent: each customer
// is credited at most once. Admin-only (enforced in the lib + is_admin RLS).
export async function POST(req: NextRequest) {
  try {
    const { entries } = (await req.json()) ?? {}
    if (!Array.isArray(entries)) {
      return apiError('entries[] is required', HTTP.BAD_REQUEST)
    }
    return apiResult(await importLoyaltyPoints(entries as LoyverseImportEntry[]))
  } catch (error: unknown) {
    return toApiError(error)
  }
}
