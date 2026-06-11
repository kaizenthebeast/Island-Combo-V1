import { NextRequest } from 'next/server'
import { createBanner, updateBanner, removeBanner } from '@/features/banners/api/admin/banner'
import { isPromoImagePath } from '@/shared/config/promo-images'
import type { BannerInsert, BannerUpdate } from '@/shared/types/banner'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// Admin-only hero/slider banner CRUD. Auth is enforced in the lib (assertAdmin),
// so an unauthenticated/non-admin caller surfaces as a clean 401/403 via toApiError.
// Reads (getBanner) stay SSR on the storefront — no GET here.
//
// image_url must be a bare path in the private promotional-images bucket
// ("banner/…", produced by the upload helper) — never a full URL. The read
// layer signs paths into displayable URLs.

// POST /api/admin/banner — create. Body: BannerInsert
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BannerInsert
    if (!body?.title?.trim()) return apiError('A banner title is required.', HTTP.BAD_REQUEST)
    if (!body.image_url || !isPromoImagePath(body.image_url)) {
      return apiError('A banner image is required (upload it first to get its storage path).', HTTP.BAD_REQUEST)
    }

    const banner = await createBanner(body)
    return apiOk({ data: banner, message: 'Banner created.' }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/admin/banner — update. Body: { id, replacedImagePath? } & BannerUpdate
export async function PATCH(req: NextRequest) {
  try {
    const { id, replacedImagePath, ...payload } = (await req.json()) as
      { id?: string; replacedImagePath?: string | null } & BannerUpdate
    if (!id) return apiError('A banner id is required.', HTTP.BAD_REQUEST)
    if (payload.image_url != null && !isPromoImagePath(payload.image_url)) {
      return apiError('image_url must be a promotional-images storage path.', HTTP.BAD_REQUEST)
    }

    const banner = await updateBanner(id, payload, replacedImagePath)
    return apiOk({ data: banner, message: 'Banner updated.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/admin/banner — remove (also deletes the stored image). Body: { id, imagePath? }
export async function DELETE(req: NextRequest) {
  try {
    const { id, imagePath } = (await req.json()) as { id?: string; imagePath?: string | null }
    if (!id) return apiError('A banner id is required.', HTTP.BAD_REQUEST)

    await removeBanner(id, imagePath ?? null)
    return apiOk({ message: 'Banner deleted.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
