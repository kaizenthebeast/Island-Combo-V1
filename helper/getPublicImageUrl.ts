const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET_NAME = 'product-images'

export function getPublicImageUrl(path: string | null | undefined): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return '/images/placeholder.png' 
  }

  if (path.startsWith('http')) return path

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`
}