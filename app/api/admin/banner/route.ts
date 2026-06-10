import { NextRequest } from 'next/server'
import { createBanner, updateBanner, removeBanner } from '@/features/banners/api/admin/banner'
import type { BannerInsert, BannerUpdate } from '@/shared/types/banner'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// Admin-only hero/slider banner CRUD. Auth is enforced in the lib (assertAdmin),
// so an unauthenticated/non-admin caller surfaces as a clean 401/403 via toApiError.
// Reads (getBanner) stay SSR on the storefront — no GET here.

// POST /api/admin/banner — create. Body: BannerInsert
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BannerInsert
    if (!body?.title?.trim()) return apiError('A banner title is required.', HTTP.BAD_REQUEST)

    const banner = await createBanner(body)
    return apiOk({ data: banner, message: 'Banner created.' }, { status: HTTP.CREATED })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/admin/banner — update. Body: { id } & BannerUpdate
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...payload } = (await req.json()) as { id?: string } & BannerUpdate
    if (!id) return apiError('A banner id is required.', HTTP.BAD_REQUEST)

    const banner = await updateBanner(id, payload)
    return apiOk({ data: banner, message: 'Banner updated.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/admin/banner — remove (also deletes the stored image). Body: { id, imageUrl? }
export async function DELETE(req: NextRequest) {
  try {
    const { id, imageUrl } = (await req.json()) as { id?: string; imageUrl?: string | null }
    if (!id) return apiError('A banner id is required.', HTTP.BAD_REQUEST)

    await removeBanner(id, imageUrl ?? null)
    return apiOk({ message: 'Banner deleted.' })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
