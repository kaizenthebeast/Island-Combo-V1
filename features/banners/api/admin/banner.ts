'use server'
/** Admin banner & promotion-ad mutations. */

import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/features/auth/api'
import { requireEnv } from '@/shared/config/env'
import { revalidatePath } from 'next/cache'
import type {
  Banner, BannerInsert, BannerUpdate,
  PromotionAd, PromotionAdInsert, PromotionAdUpdate,
} from '@/shared/types/banner'

const REVALIDATE    = '/admin/content-management/banner'
const SUPABASE_URL  = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
const BANNER_BUCKET = 'banners' as const

// ════════════════════════════════════════════════════════════════
// BANNER SLIDER — mutations
// (Reads — getBanner — live in lib/banner.ts since the storefront uses them.)
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
  revalidatePath(REVALIDATE)
  return data
}

export const updateBanner = async (id: string, payload: BannerUpdate): Promise<Banner> => {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('banners')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateBanner: ${error.message}`)
  revalidatePath(REVALIDATE)
  return data
}

export const removeBanner = async (id: string, imageUrl?: string | null): Promise<void> => {
  await assertAdmin()
  const supabase = await createClient()

  if (imageUrl) {
    const path = extractStoragePath(imageUrl, BANNER_BUCKET)
    if (path) await supabase.storage.from(BANNER_BUCKET).remove([path])
  }

  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) throw new Error(`removeBanner: ${error.message}`)
  revalidatePath(REVALIDATE)
}

// ════════════════════════════════════════════════════════════════
// PROMOTION ADS — mutations
// (Reads — getPromotionAds — live in lib/banner.ts since the storefront uses them.)
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
  revalidatePath(REVALIDATE)
  return data
}

export const updatePromotionAds = async (
  id: string,
  payload: PromotionAdUpdate,
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
  revalidatePath(REVALIDATE)
  return data
}

export const removePromotionAds = async (
  id: string,
  imageUrl?: string | null,
): Promise<void> => {
  await assertAdmin()
  const supabase = await createClient()

  if (imageUrl) {
    const path = extractStoragePath(imageUrl, BANNER_BUCKET)
    if (path) await supabase.storage.from(BANNER_BUCKET).remove([path])
  }

  const { error } = await supabase.from('promotion_ads').delete().eq('id', id)
  if (error) throw new Error(`removePromotionAds: ${error.message}`)
  revalidatePath(REVALIDATE)
}

// ════════════════════════════════════════════════════════════════
// Shared helpers
// ════════════════════════════════════════════════════════════════

// Inverse of getPublicImageUrl: full URL → storage path (for storage.remove).
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const marker = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`
    if (!url.startsWith(marker)) return null
    return decodeURIComponent(url.slice(marker.length))
  } catch {
    return null
  }
}
