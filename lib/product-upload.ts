import { createClient } from './supabase/client'
import type { AddProductFormValues } from '@/form-schema/addProductSchema'

export type UploadedImage = {
  url: string
  is_primary: boolean
  sort_order: number
}

export type VariantWithUploadedImages = Omit<AddProductFormValues['variants'][number], 'images'> & {
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
  variants: AddProductFormValues['variants']
): Promise<VariantWithUploadedImages[] | { success: false; status: number; message: string }> => {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const results = await Promise.all(
    variants.map(async (variant) => {
      const uploadedImages = await Promise.all(
        variant.images.map(async ({ file, is_primary, sort_order, url: existingUrl }) => {
          // Existing Storage image — file is null so skip upload and pass
          // the existing Storage path through to the RPC as-is
          if (!file || (file as any) === null) {
            return { url: existingUrl as string, is_primary, sort_order }
          }

          // New image — upload to Storage and return the generated path
          const path = `variants/${generateFileName(file)}`
          const { error } = await supabase.storage
            .from('product-images')
            .upload(path, file)

          if (error) return { success: false, status: 403, message: `Image upload failed: ${error.message}` }
          return { url: path, is_primary, sort_order }
        })
      )

      // Bubble up any upload error from the image map
      const failedImage = uploadedImages.find((img) => 'success' in img && !img.success)
      if (failedImage) return failedImage as { success: false; status: number; message: string }

      const { images: _images, ...rest } = variant
      return {
        ...rest,
        // Pass variant_id through if present so the RPC knows to UPDATE
        variant_id: (variant as any).variant_id as number | undefined,
        images: uploadedImages as UploadedImage[],
      }
    })
  )

  // Bubble up any variant-level error from the variant map
  const failedVariant = results.find((r) => r && 'success' in r && !r.success)
  if (failedVariant) return failedVariant as { success: false; status: number; message: string }

  return results as VariantWithUploadedImages[]
}