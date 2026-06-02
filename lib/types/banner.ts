/** Shared banner & promotion-ad types. */
// Banner Slider
// Full-width rotating hero banners (typically at the top of a page)

export type Banner = {
  id:            string
  title:         string
  description:   string | null
  image_url:     string | null
  cta_label:     string | null
  cta_url:       string | null
  start_date:    string | null   // ISO 8601 — e.g. "2024-06-01T00:00:00Z"
  end_date:      string | null
  display_order: number
  is_active:     boolean
  created_at:    string
  updated_at:    string
}

export type BannerInsert = Omit<Banner, 'id' | 'created_at' | 'updated_at'>
export type BannerUpdate = Partial<BannerInsert>


// Promotion Ads
// Smaller ads shown in specific sections/pages across the storefront.
// Use `placement` to control where each ad appears on the frontend.

export type AdPlacement =
  | 'landing'   // homepage hero section or banner strip
  | 'checkout'  // shown during the checkout flow
  | 'cart'      // shown on the cart page
  | 'category'  // shown inside product category pages
  | 'product'   // shown on individual product pages

export type PromotionAd = {
  id:            string
  title:         string
  description:   string | null
  image_url:     string | null
  cta_label:     string | null
  cta_url:       string | null
  placement:     AdPlacement        // which page/section this ad targets
  start_date:    string | null
  end_date:      string | null
  display_order: number
  is_active:     boolean
  created_at:    string
  updated_at:    string
}

export type PromotionAdInsert = Omit<PromotionAd, 'id' | 'created_at' | 'updated_at'>
export type PromotionAdUpdate = Partial<PromotionAdInsert>


// Shared helpers

export type ContentStatus = 'active' | 'scheduled' | 'expired' | 'inactive'

export function getContentStatus(item: {
  is_active: boolean
  start_date: string | null
  end_date: string | null
}): ContentStatus {
  if (!item.is_active) return 'inactive'
  const now = new Date()
  if (item.start_date && new Date(item.start_date) > now) return 'scheduled'
  if (item.end_date   && new Date(item.end_date)   < now) return 'expired'
  return 'active'
}