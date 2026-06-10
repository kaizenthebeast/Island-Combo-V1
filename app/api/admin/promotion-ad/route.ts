import { NextRequest } from 'next/server'
import {
  createPromotionAds,
  updatePromotionAds,
  removePromotionAds,
} from '@/features/banners/api/admin/banner'
import type { AdPlacement, PromotionAdInsert, PromotionAdUpdate } from '@/shared/types/banner'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// Admin-only promotion-ad CRUD. Auth is enforced in the lib (assertAdmin).
// Reads (getPromotionAds) stay SSR on the storefront — no GET here.
const PLACEMENTS: AdPlacement[] = ['landing', 'checkout', 'cart', 'category', 'product']

// POST /api/admin/promotion-ad — create. Body: PromotionAdInsert
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PromotionAdInsert
    if (!body?.title?.trim()) return apiError('An ad title is required.', HTTP.BAD_REQUEST)
    if (!body.placement || !PLACEMENTS.includes(body.placement)) {
      return apiError(`placement must be one of: ${PLACEMENTS.join(', ')}`, HTTP.BAD_REQUEST)
    }

    const ad = await createPromotionAds(body)
    return apiOk({ data: ad, message: 'Promotion ad created.' }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/admin/promotion-ad — update. Body: { id } & PromotionAdUpdate
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...payload } = (await req.json()) as { id?: string } & PromotionAdUpdate
    if (!id) return apiError('A promotion-ad id is required.', HTTP.BAD_REQUEST)
    if (payload.placement !== undefined && !PLACEMENTS.includes(payload.placement)) {
      return apiError(`placement must be one of: ${PLACEMENTS.join(', ')}`, HTTP.BAD_REQUEST)
    }

    const ad = await updatePromotionAds(id, payload)
    return apiOk({ data: ad, message: 'Promotion ad updated.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/admin/promotion-ad — remove (also deletes the stored image). Body: { id, imageUrl? }
export async function DELETE(req: NextRequest) {
  try {
    const { id, imageUrl } = (await req.json()) as { id?: string; imageUrl?: string | null }
    if (!id) return apiError('A promotion-ad id is required.', HTTP.BAD_REQUEST)

    await removePromotionAds(id, imageUrl ?? null)
    return apiOk({ message: 'Promotion ad deleted.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
