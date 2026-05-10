// form-schema/editProductSchema.ts
import { z } from 'zod'

const pricingTierSchema = z.object({
  id: z.number().optional(),
  label: z.string().default('wholesale'),
  min_quantity: z.number().min(1, 'Required'),
  discount_percent: z.number().min(0).max(100),
})

const attributeSchema = z.object({
  id: z.number().optional(),
  attribute_name: z.string().min(1),
  attribute_value: z.string().min(1, 'Required'),
})

const imageSchema = z.object({
  file: z.instanceof(File).optional(),  // undefined = existing image
  preview: z.string(),                   // URL for existing, blob for new
  is_primary: z.boolean(),
  sort_order: z.number(),
  path: z.string().optional(),           // storage path for existing images
})

const variantSchema = z.object({
  variant_id: z.number().optional(),  
  sku: z.string().optional(),
  price: z.number().min(0),
  stock: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
  pricing_tiers: z.array(pricingTierSchema).default([]),
  deleted_tier_ids: z.array(z.number()).default([]),
  attributes: z.array(attributeSchema).default([]),
  deleted_attribute_ids: z.array(z.number()).default([]),
  images: z.array(imageSchema).default([]),
  deleted_image_paths: z.array(z.string()).default([]),
})

export const editProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  discount: z.number().nullable().optional(),
  category_id: z.number().nullable().optional(),
  type: z.string().optional(),

  product_details: z.array(z.object({
    id: z.number().optional(),
    attribute_name: z.string().min(1),
    attribute_value: z.string().min(1),
    sort_order: z.number().default(0),
  })).default([]),

  deleted_detail_ids: z.array(z.number()).default([]),
  deleted_variant_ids: z.array(z.number()).default([]),

  variants: z.array(variantSchema).min(1, 'At least one variant required'),
})

export type EditProductFormValues = z.infer<typeof editProductSchema>