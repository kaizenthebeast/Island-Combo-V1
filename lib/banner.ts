'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Banner, BannerInsert, BannerUpdate,
  PromotionAd, PromotionAdInsert, PromotionAdUpdate,
  AdPlacement,
} from '@/types/banner'

const REVALIDATE    = '/admin/content-management/banner'
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!  
const BANNER_BUCKET = 'banners' as const

// ════════════════════════════════════════════════════════════════
// BANNER SLIDER
// Full-width rotating hero banners
// ════════════════════════════════════════════════════════════════

export const getBanner = async (activeOnly = false): Promise<Banner[]> => {
  const supabase = await createClient()

  let query = supabase
    .from('banners')
    .select('*')
    .order('display_order', { ascending: true })

  if (activeOnly) {
    const now = new Date().toISOString()
    query = query
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
  }

  const { data, error } = await query
  if (error) throw new Error(`getBanner: ${error.message}`)
  return data ?? []
}

export const createBanner = async (payload: BannerInsert): Promise<Banner> => {
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
// PROMOTION ADS
// Smaller ads targeted to specific pages via `placement`
// ════════════════════════════════════════════════════════════════

/**
 * @param placement  Filter by page placement — omit to fetch all (admin).
 * @param activeOnly Pass true on the storefront to only return live ads.
 *
 * @example
 * // Admin
 * const all = await getPromotionAds()
 * // Storefront landing page
 * const ads = await getPromotionAds('landing', true)
 * // Storefront checkout
 * const ads = await getPromotionAds('checkout', true)
 */
export const getPromotionAds = async (
  placement?: AdPlacement,
  activeOnly = false
): Promise<PromotionAd[]> => {
  const supabase = await createClient()

  let query = supabase
    .from('promotion_ads')
    .select('*')
    .order('display_order', { ascending: true })

  if (placement) query = query.eq('placement', placement)

  if (activeOnly) {
    const now = new Date().toISOString()
    query = query
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
  }

  const { data, error } = await query
  if (error) throw new Error(`getPromotionAds: ${error.message}`)
  return data ?? []
}

export const createPromotionAds = async (payload: PromotionAdInsert): Promise<PromotionAd> => {
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
  payload: PromotionAdUpdate
): Promise<PromotionAd> => {
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
  imageUrl?: string | null
): Promise<void> => {
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

/**
 * Inverse of your getPublicImageUrl helper.
 *
 * getPublicImageUrl  : path → full URL
 *   `my-image.jpg`
 *   → `https://xxx.supabase.co/storage/v1/object/public/banners/my-image.jpg`
 *
 * extractStoragePath : full URL → path  (used before storage.remove)
 *   `https://xxx.supabase.co/storage/v1/object/public/banners/my-image.jpg`
 *   → `my-image.jpg`
 */
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const marker = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`
    if (!url.startsWith(marker)) return null
    return decodeURIComponent(url.slice(marker.length))
  } catch {
    return null
  }
}