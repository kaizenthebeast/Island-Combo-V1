'use server'

import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProductCatalogItem, ProductDetails, AdminProduct } from '@/types/product'
import type { VariantWithUploadedImages } from './product-upload'
import { AddProductFormValues } from '@/form-schema/addProductSchema'

type ActionType = 'product' | 'variant'

export type AddProductPayload = Omit<AddProductFormValues, 'variants'> & {
  variants: VariantWithUploadedImages[]
}

// Separate payload type for update — accepts a looser shape since the edit
// form passes extra fields (variant_id, deleted_*, pricing_tiers) that the
// add form doesn't have, and we cast to any before sending to the RPC anyway.
export type UpdateProductPayload = {
  name: string
  slug: string
  description?: string
  is_active: boolean
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
    is_active: boolean
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

  const { data, error } = await supabase
    .from('product_catalog_mv')
    .select('*')

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

export const getAdminProducts = async () => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { success: false, status: 403, message: error.message }

  return {success: true, status: 200, data}
}

// ─── ADMIN — CREATE ───────────────────────────────────────────────────────────

export const addAdminProduct = async (data: AddProductPayload) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const payload = {
    ...data,
    variants: data.variants.map((v) => ({
      price: v.price,
      stock: v.stock,
      is_active: v.is_active,
      attributes: v.attributes,
      images: v.images,
      pricing_tiers: v.pricing_tiers ?? [],
    })),
  }

  const { data: result, error } = await supabase.rpc('add_admin_product', { payload })

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/products')
  return { success: true, status: 201, message: 'Product successfully created', data: result }
}


// ─── ADMIN — UPDATE ───────────────────────────────────────────────────────────

export const updateAdminProduct = async (
  productId: number,
  data: UpdateProductPayload
) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const payload = {
    product_id: productId,
    name: data.name,
    slug: data.slug,
    description: data.description,
    is_active: data.is_active,
    discount: data.discount,
    category_id: data.category_id,
    type: data.type,

    // Product details — full replace handled by the RPC
    details: data.product_details ?? [],

    // Variants — RPC decides UPDATE vs INSERT per variant based on variant_id
    variants: data.variants.map((v) => ({
      ...(v.variant_id ? { variant_id: v.variant_id } : {}),
      price: v.price,
      stock: v.stock,
      is_active: v.is_active,
      pricing_tiers: (v.pricing_tiers ?? []).map((t) => ({
        label: t.label,
        min_quantity: t.min_quantity,
        discount_percent: t.discount_percent,
      })),
      attributes: (v.attributes ?? []).map((a) => ({
        attribute_name: a.attribute_name,
        attribute_value: a.attribute_value,
      })),
      images: v.images,
    })),
  }

  const { data: result, error } = await supabase.rpc('update_admin_product', { payload })

  if (error) return { success: false, status: 403, message: error.message }

  revalidatePath('/admin/products')
  return { success: true, status: 200, message: 'Product successfully updated', data: result }
}


// ─── ADMIN — DELETE ───────────────────────────────────────────────────────────

export const deleteProduct = async (id: number, type: ActionType) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  if (type === 'product') {
    const { error, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .eq('product_id', id)

    if (error) return { success: false, status: 403, message: error.message }
    if (count === 0) return { success: false, status: 404, message: 'Product not found' }

    revalidatePath('/admin/products')
    return { success: true, status: 200, message: 'Product successfully deleted' }

  } else {
    const { error, count } = await supabase
      .from('product_variants')
      .delete({ count: 'exact' })
      .eq('variant_id', id)

    if (error) return { success: false, status: 403, message: error.message }
    if (count === 0) return { success: false, status: 404, message: 'Variant not found' }

    revalidatePath('/admin/products')
    return { success: true, status: 200, message: 'Variant successfully deleted' }
  }
}


// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export const getAllSubCategories = async () => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('category')
    .select('category_id, name')
    .not('parent_id', 'is', null)

  if (error) throw new Error(error.message)

  return data
}

export const getAllParentCategories = async () => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('category')
    .select('category_id, name')
    .is('parent_id', null)

  if (error) throw new Error(error.message)

  return data
}