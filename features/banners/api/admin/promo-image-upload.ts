/** Admin: upload banner / promotion-ad images to the PRIVATE promotional-images
 *  bucket. Dimensions are validated STRICTLY before upload — a file that isn't
 *  exactly the spec size for its kind is rejected client-side, so the bucket
 *  only ever holds correctly-sized artwork.
 *
 *  Flow: validate → upload → Storage returns the path → that bare path is what
 *  gets stored in banners.image_url / promotion_ads.image_url. Resolving the
 *  path back to a displayable (signed) URL is the read layer's job.
 *  Filename: {kind}/{timestamp}-{uuid}.ext */
import { createClient } from '@/shared/lib/db/client'
import {
  PROMO_IMAGE_BUCKET,
  PROMO_IMAGE_SPECS,
  PROMO_IMAGE_MAX_BYTES,
  PROMO_IMAGE_MIME_TYPES,
  describePromoImageSpec,
  type PromoImageKind,
} from '@/shared/config/promo-images'

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The file could not be read as an image.'))
    }
    img.src = url
  })
}

/** Validate type, size and EXACT dimensions. Returns an error message, or null when valid. */
export async function validatePromoImage(file: File, kind: PromoImageKind): Promise<string | null> {
  if (!(PROMO_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `Unsupported file type — use ${describePromoImageSpec(kind)}.`
  }
  if (file.size > PROMO_IMAGE_MAX_BYTES) {
    return 'The image is larger than 5MB.'
  }

  const spec = PROMO_IMAGE_SPECS[kind]
  let dims: { width: number; height: number }
  try {
    dims = await readImageDimensions(file)
  } catch {
    return 'The file could not be read as an image.'
  }
  if (dims.width !== spec.width || dims.height !== spec.height) {
    return `The image must be exactly ${spec.width}×${spec.height}px — yours is ${dims.width}×${dims.height}px.`
  }
  return null
}

/** Validate + upload. Resolves to the bare storage path to persist in image_url. */
export async function uploadPromoImage(file: File, kind: PromoImageKind): Promise<string> {
  const invalid = await validatePromoImage(file, kind)
  if (invalid) throw new Error(invalid)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized: you must be logged in to upload images')

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${kind}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(PROMO_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`Image upload failed: ${error.message}`)

  return path
}

/** Best-effort cleanup when a create fails after its image already uploaded. */
export async function removePromoImage(path: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(PROMO_IMAGE_BUCKET).remove([path])
}
