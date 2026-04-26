import { createClient } from './supabase/client'
import type { AddProductFormValues } from '@/form-schema/addProductSchema'

export type UploadedImage = {
  url: string
  is_primary: boolean
  sort_order: number
}

export type VariantWithUploadedImages = Omit<   
  AddProductFormValues['variants'][number],
  'images'
> & {
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
        variant.images.map(async ({ file, is_primary, sort_order }) => {
          const path = `variants/${generateFileName(file)}`

          const { error } = await supabase.storage
            .from('product-images')
            .upload(path, file)

          if (error) throw new Error(`Image upload failed: ${error.message}`)

          return { url: path, is_primary, sort_order }
        })
      )

      const { images: _images, ...rest } = variant
      return { ...rest, images: uploadedImages }
    })
  )
}