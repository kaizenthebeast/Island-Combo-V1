'use server'
/** Storefront banner & promotion-ad reads. */

import { createClient } from '@/shared/lib/db/server'
import { PROMO_IMAGE_BUCKET } from '@/shared/config/promo-images'
import type {
  Banner, BannerWithImage,
  PromotionAd, PromotionAdWithImage,
  AdPlacement,
} from '@/shared/types/banner'
import type { SupabaseClient } from '@supabase/supabase-js'

// Reads only — admin mutations live in api/admin/banner.ts.
// Reads stay here because both the storefront and admin pages use them.
//
// image_url in the DB is a bare path inside the PRIVATE promotional-images
// bucket; rows leave this module with an extra `image_src` — a short-lived
// signed URL — so no caller ever builds a storage URL by hand.

const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1h: outlives any page view, short enough to stay revocable

/** Resolve each row's stored image path to a signed URL (`image_src`), in one
 *  storage round-trip. Rows without an image come back with image_src = null. */
async function resolvePromoImages<T extends { image_url: string | null }>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<(T & { image_src: string | null })[]> {
  const paths = [...new Set(rows.map((r) => r.image_url).filter((p): p is string => !!p))]

  const signedByPath = new Map<string, string>()
  if (paths.length) {
    const { data: signed, error } = await supabase.storage
      .from(PROMO_IMAGE_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    if (error) throw new Error(`resolvePromoImages: ${error.message}`)
    for (const s of signed ?? []) if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl)
  }

  return rows.map((row) => ({
    ...row,
    image_src: row.image_url ? (signedByPath.get(row.image_url) ?? null) : null,
  }))
}

// ════════════════════════════════════════════════════════════════
// BANNER SLIDER
// Full-width rotating hero banners
// ════════════════════════════════════════════════════════════════

export const getBanner = async (activeOnly = false): Promise<BannerWithImage[]> => {
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
  return resolvePromoImages<Banner>(supabase, data ?? [])
}

// ════════════════════════════════════════════════════════════════
// PROMOTION ADS
// Smaller ads targeted to specific pages via `placement`
// ════════════════════════════════════════════════════════════════

/**
 * @param placement  Filter by page placement — omit to fetch all (admin).
 * @param activeOnly Pass true on the storefront to only return live ads.
 */
export const getPromotionAds = async (
  placement?: AdPlacement,
  activeOnly = false,
): Promise<PromotionAdWithImage[]> => {
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
  return resolvePromoImages<PromotionAd>(supabase, data ?? [])
}
