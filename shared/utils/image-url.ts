/** Resolve a Supabase Storage path to a public URL. */
import { requireEnv } from '@/shared/config/env'

const SUPABASE_URL = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')

export function getPublicImageUrl(
  path: string | null | undefined,
  bucket: 'product-images' | 'banners' | 'review-media' = 'product-images'
): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return '/images/placeholder.png'
  }

  if (path.startsWith('http')) return path

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

/** Resolve a review-media storage path (photo OR video) to its public URL.
 *  Thin wrapper so callers can't accidentally resolve review media against the
 *  default product-images bucket. */
export function getReviewMediaUrl(path: string | null | undefined): string {
  return getPublicImageUrl(path, 'review-media')
}

/** True when a stored media path points to a video (review media can be either). */
export function isVideoPath(path: string | null | undefined): boolean {
  return !!path && /\.(mp4|mov|m4v|webm|ogg|quicktime)$/i.test(path)
}