const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export function getPublicImageUrl(
  path: string | null | undefined,
  bucket: 'product-images' | 'banners' = 'product-images'  
): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return '/images/placeholder.png'
  }

  if (path.startsWith('http')) return path

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}