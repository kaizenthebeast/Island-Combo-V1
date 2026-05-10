import { createClient } from './supabase/client'
import type { AddProductFormValues } from '@/form-schema/addProductSchema'

export type UploadedImage = {
  url: string
  is_primary: boolean
  sort_order: number
}

export type VariantWithUploadedImages = Omit< AddProductFormValues['variants'][number],'images'> & {
  // variant_id is optional  present when updating an existing variant,
  // absent when inserting a new one. The RPC uses its presence to decide
  // UPDATE vs INSERT per variant.
  variant_id?: number
  images: UploadedImage[]
}

function generateFileName(file: File): string {
  const ext = file.name.split('.').pop()
  return `${Date.now()}-${crypto.randomUUID()}.${ext}`
}

export async function uploadVariantImages(
  variants: AddProductFormValues['variants']
): Promise<VariantWithUploadedImages[]> {
  const supabase = createClient()

  return Promise.all(
    variants.map(async (variant) => {
      const uploadedImages = await Promise.all(
        variant.images.map(async ({ file, is_primary, sort_order, url: existingUrl }) => {
          // Existing Storage image file is null so skip upload and pass
          // the existing Storage path through to the RPC as-is
          if (!file || (file as any) === null) {
            return { url: existingUrl as string, is_primary, sort_order }
          }

          // New image upload to Storage and return the generated path
          const path = `variants/${generateFileName(file)}`
          const { error } = await supabase.storage
            .from('product-images')
            .upload(path, file)

          if (error) throw new Error(`Image upload failed: ${error.message}`)
          return { url: path, is_primary, sort_order }
        })
      )

      const { images: _images, ...rest } = variant
      return {
        ...rest,
        // Pass variant_id through if present so the RPC knows to UPDATE
        variant_id: (variant as any).variant_id as number | undefined,
        images: uploadedImages,
      }
    })
  )
}