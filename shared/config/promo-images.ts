/** Promotional-image rules shared by the admin form, the upload helper and the
 *  API routes. The bucket is PRIVATE: the DB stores only the object path
 *  (e.g. "banner/1718…-uuid.webp") and reads resolve it to a signed URL.
 *
 *  Dimensions are STRICT — uploads must match exactly (no scaling/cropping
 *  server-side), which keeps rendered banners crisp at a fixed aspect ratio.
 *  Tune the numbers here and every layer follows.
 */

export const PROMO_IMAGE_BUCKET = 'promotional-images' as const

export type PromoImageKind = 'banner' | 'ad'

export const PROMO_IMAGE_SPECS: Record<PromoImageKind, { width: number; height: number }> = {
  banner: { width: 1920, height: 640 }, // full-width hero slider (3:1)
  ad:     { width: 1200, height: 400 }, // in-page promotion strips (3:1)
}

export const PROMO_IMAGE_MAX_BYTES = 5 * 1024 * 1024 // keep in sync with the bucket's file_size_limit
export const PROMO_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/** True when `value` is a bare storage path we generated ("banner/…" or "ad/…").
 *  Routes use this to reject full URLs / arbitrary strings before they reach the DB. */
export function isPromoImagePath(value: string): boolean {
  return /^(banner|ad)\/[A-Za-z0-9._-]+$/.test(value)
}

export function describePromoImageSpec(kind: PromoImageKind): string {
  const { width, height } = PROMO_IMAGE_SPECS[kind]
  return `${width}×${height}px PNG, JPEG or WebP, up to 5MB`
}
