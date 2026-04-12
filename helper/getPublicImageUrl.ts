const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET_NAME = 'product-images'

export function getPublicImageUrl(path: string | null) {
  if (!path) return null

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`
}