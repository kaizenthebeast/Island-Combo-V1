import { NextRequest } from 'next/server'
import { linkLoyaltyCard, unlinkLoyaltyCard } from '@/lib/admin/loyalty'
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'

// POST /api/admin/loyalty-card — Link Loyalty Card Number API (§3.8, back office)
// Admin links a physical card to a customer profile; has_perks flips on. Admin
// authorization is enforced in the lib (requireAdmin) + is_admin RLS.
export async function POST(req: NextRequest) {
  try {
    const { userId, cardNumber } = (await req.json()) ?? {}
    if (!userId || !cardNumber) {
      return apiError('userId and cardNumber are required', HTTP.BAD_REQUEST)
    }
    return apiResult(await linkLoyaltyCard(String(userId), String(cardNumber)))
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/admin/loyalty-card — unlink a customer's loyalty card.
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = (await req.json()) ?? {}
    if (!userId) return apiError('userId is required', HTTP.BAD_REQUEST)
    return apiResult(await unlinkLoyaltyCard(String(userId)))
  } catch (error: unknown) {
    return toApiError(error)
  }
}
