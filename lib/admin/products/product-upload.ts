/** Admin: upload product variant images to Storage. */
import { createClient } from '@/lib/supabase/client'
import type { ProductFormValues } from '@/lib/validators/product'

export type UploadedImage = {
  url: string
  is_primary: boolean
  sort_order: number
}

export type VariantWithUploadedImages = Omit<
  ProductFormValues['variants'][number],
  'images'
> & {
  // variant_id is optional — present when updating an existing variant,
  // absent when inserting a new one. The RPC uses its presence to decide
  // UPDATE vs INSERT per variant.
  variant_id?: number
  images: UploadedImage[]
}

function generateFileName(file: File): string {
  const ext = file.name.split('.').pop()
  return `${Date.now()}-${crypto.randomUUID()}.${ext}`
}

export const uploadVariantImages = async (
  variants: ProductFormValues['variants']
): Promise<VariantWithUploadedImages[]> => {
  const supabase = createClient()

  // Auth check — throw immediately so the caller's try/catch surfaces it
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized: you must be logged in to upload images')

  return Promise.all(
    variants.map(async (variant) => {
      const uploadedImages = await Promise.all(
        variant.images.map(async ({ file, is_primary, sort_order, url: existingUrl, path: existingPath }) => {
          // Existing Storage image — file is null/undefined so skip upload.
          // Edit flow stores the path in `path`; add flow stores it in `url`.
          // Fall back between both so either form works correctly.
          if (!file) {
            const storagePath = existingPath ?? existingUrl
            if (!storagePath) throw new Error('Existing image is missing a storage path')
            return { url: storagePath, is_primary, sort_order }
          }

          // New image — upload to Storage and return the generated path.
          // Throws on failure so Promise.all rejects and the caller catches it.
          const uploadPath = `variants/${generateFileName(file)}`
          const { error } = await supabase.storage
            .from('product-images')
            .upload(uploadPath, file)

          if (error) throw new Error(`Image upload failed: ${error.message}`)

          return { url: uploadPath, is_primary, sort_order }
        })
      )

      const { images: _images, ...rest } = variant
      return {
        ...rest,
        // Pass variant_id through if present so the RPC knows to UPDATE
        variant_id: variant.variant_id,
        images: uploadedImages,
      }
    })
  )
}