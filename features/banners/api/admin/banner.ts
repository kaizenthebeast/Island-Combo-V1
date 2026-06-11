'use server'
/** Admin banner & promotion-ad mutations. */

import { createClient } from '@/shared/lib/db/server'
import { assertAdmin } from '@/features/auth/api'
import { PROMO_IMAGE_BUCKET, isPromoImagePath } from '@/shared/config/promo-images'
import { revalidatePath } from 'next/cache'
import type {
  Banner, BannerInsert, BannerUpdate,
  PromotionAd, PromotionAdInsert, PromotionAdUpdate,
} from '@/shared/types/banner'

// image_url is a bare path inside the private promotional-images bucket
// (uploaded client-side by promo-image-upload.ts). Mutations never see full
// URLs — resolving paths to signed URLs happens in the read layer.

const REVALIDATE = ['/admin/content-management/banner', '/'] as const

const revalidateAll = () => REVALIDATE.forEach((path) => revalidatePath(path))

// ════════════════════════════════════════════════════════════════
// BANNER SLIDER — mutations
// (Reads — getBanner — live in api/banner.ts since the storefront uses them.)
// ════════════════════════════════════════════════════════════════

export const createBanner = async (payload: BannerInsert): Promise<Banner> => {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('banners')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createBanner: ${error.message}`)
  revalidateAll()
  return data
}

/** @param replacedImagePath old storage path to clean up after the row update
 *  (set when the admin swapped or removed the image). */
export const updateBanner = async (
  id: string,
  payload: BannerUpdate,
  replacedImagePath?: string | null,
): Promise<Banner> => {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('banners')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateBanner: ${error.message}`)
  await removeStoredImage(supabase, replacedImagePath)
  revalidateAll()
  return data
}

export const removeBanner = async (id: string, imagePath?: string | null): Promise<void> => {
  await assertAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) throw new Error(`removeBanner: ${error.message}`)
  await removeStoredImage(supabase, imagePath)
  revalidateAll()
}

// ════════════════════════════════════════════════════════════════
// PROMOTION ADS — mutations
// (Reads — getPromotionAds — live in api/banner.ts since the storefront uses them.)
// ════════════════════════════════════════════════════════════════

export const createPromotionAds = async (payload: PromotionAdInsert): Promise<PromotionAd> => {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotion_ads')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createPromotionAds: ${error.message}`)
  revalidateAll()
  return data
}

export const updatePromotionAds = async (
  id: string,
  payload: PromotionAdUpdate,
  replacedImagePath?: string | null,
): Promise<PromotionAd> => {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotion_ads')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updatePromotionAds: ${error.message}`)
  await removeStoredImage(supabase, replacedImagePath)
  revalidateAll()
  return data
}

export const removePromotionAds = async (
  id: string,
  imagePath?: string | null,
): Promise<void> => {
  await assertAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('promotion_ads').delete().eq('id', id)
  if (error) throw new Error(`removePromotionAds: ${error.message}`)
  await removeStoredImage(supabase, imagePath)
  revalidateAll()
}

// ════════════════════════════════════════════════════════════════
// Shared helpers
// ════════════════════════════════════════════════════════════════

// Best-effort: the row mutation already succeeded, so an orphaned file must not
// fail the request. Only paths we generated are accepted (never full URLs).
async function removeStoredImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined,
): Promise<void> {
  if (!path || !isPromoImagePath(path)) return
  await supabase.storage.from(PROMO_IMAGE_BUCKET).remove([path])
}
