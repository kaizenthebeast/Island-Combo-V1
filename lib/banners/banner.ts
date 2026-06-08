'use server'
/** Storefront banner & promotion-ad reads. */

import { createClient } from '@/lib/supabase/server'
import type { Banner, PromotionAd, AdPlacement } from '@/types/banner'

// Reads only — admin mutations live in lib/admin/banner.ts.
// Reads stay here because both the storefront and admin pages use them.

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
