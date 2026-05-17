'use server'
import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProductCatalogItem, ProductDetails, AdminProduct } from '@/types/product'
import type { VariantWithUploadedImages } from './product-upload'
import { AddProductFormValues } from '@/form-schema/addProductSchema'

export type AddProductPayload = Omit<AddProductFormValues, 'variants'> & {
  variants: VariantWithUploadedImages[]
}

export type UpdateProductPayload = {
  name: string
  slug: string
  description?: string
  status: 'ACTIVE' | 'DRAFT' | 'HIDDEN' | 'ARCHIVED'  
  discount?: number | null
  category_id?: number
  type?: string
  product_details?: any[]
  deleted_detail_ids?: number[]
  variants: {
    variant_id?: number
    sku?: string
    price: number
    stock: number
    is_active: boolean  // variant still uses is_active
    pricing_tiers?: { label: string; min_quantity: number; discount_percent: number }[]
    deleted_tier_ids?: number[]
    attributes?: { attribute_name: string; attribute_value: string }[]
    deleted_attribute_ids?: number[]
    images: string[]
    deleted_image_paths?: string[]
  }[]
}

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

export const getAllProducts = async (): Promise<ProductCatalogItem[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('product_catalog_mv').select('*')
  if (error) throw new Error(error.message)
  return data
}

export const getProductBySlug = async (p_slug: string): Promise<ProductDetails> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_product_by_slug', { p_slug })
  if (error) throw new Error(error.message)
  return data
}

// ─── ADMIN — READ ─────────────────────────────────────────────────────────────

export const getAdminProducts = async (): Promise<AdminProduct[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((p) => ({
    ...p,
    product_details: p.product_details ?? [],
    variants: p.variants ?? [],
  }))
}

export const getAdminProductById = async (productId: number): Promise<AdminProduct | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .eq('product_id', productId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return {
    ...data,
    product_details: data.product_details ?? [],
    variants: data.variants ?? [],
  }
}

// ─── ADMIN — CREATE ───────────────────────────────────────────────────────────

export const addAdminProduct = async (data: AddProductPayload) => {
  const supabase = await createClient()

  const payload = {
    ...data,
    variants: data.variants.map((v) => ({
      price:         v.price,
      stock:         v.stock,
      is_active:     v.is_active,
      attributes:    v.attributes,
      images:        v.images,
      pricing_tiers: v.pricing_tiers ?? [],
    })),
  }

  const { data: result, error } = await supabase.rpc('add_admin_product', { payload })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return result as number
}

// ─── ADMIN — UPDATE ───────────────────────────────────────────────────────────

export const updateAdminProduct = async (
  productId: number,
  data: UpdateProductPayload
) => {
  const supabase = await createClient()

  const payload = {
    product_id:  productId,
    name:        data.name,
    slug:        data.slug,
    description: data.description,
    status:      data.status, 
    discount:    data.discount,
    category_id: data.category_id,
    type:        data.type,
    details:     data.product_details ?? [],
    variants:    data.variants.map((v) => ({
      ...(v.variant_id ? { variant_id: v.variant_id } : {}),
      price:                 v.price,
      stock:                 v.stock,
      is_active:             v.is_active,
      pricing_tiers:         (v.pricing_tiers ?? []).map((t) => ({
        label:            t.label,
        min_quantity:     t.min_quantity,
        discount_percent: t.discount_percent,
      })),
      attributes:            (v.attributes ?? []).map((a) => ({
        attribute_name:  a.attribute_name,
        attribute_value: a.attribute_value,
      })),
      images:                v.images,
    })),
  }

  const { data: result, error } = await supabase.rpc('update_admin_product', { payload })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return result as number
}

// ─── ADMIN — SOFT DELETE ──────────────────────────────────────────────────────
// Sets is_active = false instead of deleting the row so order history
// referencing this product is preserved (auditable soft delete).

export const softDeleteProduct = async (productId: number) => {
  const supabase = await createClient()

  // First check the product exists
  const { count, error: countError } = await supabase
    .from('products')
    .select('product_id', { count: 'exact', head: true })
    .eq('product_id', productId)

  if (countError) throw new Error(countError.message)
  if (!count || count === 0) throw new Error('Product not found')

  // Then soft delete by setting status to ARCHIVED
  const { error } = await supabase
    .from('products')
    .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
    .eq('product_id', productId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return productId
}

// ─── ADMIN — HARD DELETE (variant only) ──────────────────────────────────────

export const deleteVariant = async (variantId: number) => {
  const supabase = await createClient()

  const { error, count } = await supabase
    .from('product_variants')
    .delete({ count: 'exact' })
    .eq('variant_id', variantId)

  if (error) throw new Error(error.message)
  if (!count || count === 0) throw new Error('Variant not found')

  revalidatePath('/admin/products')
  return variantId
}

