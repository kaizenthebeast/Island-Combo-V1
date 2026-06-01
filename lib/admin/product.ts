'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AdminProduct } from '@/types/product'
import type { VariantWithUploadedImages } from '@/lib/product-upload'
import type { ProductFormValues } from '@/form-schema/productSchema'

export type AddProductPayload = Omit<ProductFormValues, 'variants'> & {
  variants: VariantWithUploadedImages[]
}

export type UpdateProductPayload = {
  name: string
  slug: string
  description?: string | null
  status: 'ACTIVE' | 'DRAFT' | 'HIDDEN' | 'ARCHIVED'
  discount?: number | null
  category_id?: number | null
  type?: string
  product_details?: {
    id?: number
    attribute_name: string
    attribute_value: string
    sort_order: number
  }[]
  deleted_detail_ids?: number[]
  deleted_variant_ids?: number[]
  variants: {
    variant_id?: number
    sku?: string
    price: number
    stock: number
    is_active: boolean
    pricing_tiers?: {
      id?: number
      label: string
      min_quantity: number
      discount_percent: number
    }[]
    deleted_tier_ids?: number[]
    attributes?: {
      id?: number
      attribute_name: string
      attribute_value: string
    }[]
    deleted_attribute_ids?: number[]
    images: string[]
    deleted_image_paths?: string[]
  }[]
}

// ─── READ (paginated) ─────────────────────────────────────────────────────────

export type AdminProductsPageInput = {
  page: number              // 1-indexed
  pageSize: number
  search?: string           // matches name (case-insensitive)
  status?: string           // 'ACTIVE' | 'DRAFT' | 'HIDDEN' | 'ARCHIVED' | undefined = all
  sortKey?: 'name' | 'product_id' | 'type' | 'status' | 'created_at'
  sortDir?: 'asc' | 'desc'
}

export type AdminProductsPageResult = {
  rows: AdminProduct[]
  total: number
}

export const getAdminProductsPage = async (
  input: AdminProductsPageInput,
): Promise<AdminProductsPageResult> => {
  const supabase = await createClient()

  const {
    page,
    pageSize,
    search,
    status,
    sortKey = 'created_at',
    sortDir = 'desc',
  } = input

  let query = supabase
    .from('admin_products_mv')
    .select('*', { count: 'exact' })

  if (status && status !== 'All') {
    query = query.eq('status', status)
  }

  const q = search?.trim()
  if (q) {
    // Escape Postgres ILIKE wildcards in user input so the search behaves literally.
    const safe = q.replace(/[\\%_,]/g, (c) => `\\${c}`)
    query = query.ilike('name', `%${safe}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query
    .order(sortKey, { ascending: sortDir === 'asc' })
    .range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const rows: AdminProduct[] = (data ?? []).map((p) => ({
    ...p,
    product_details: p.product_details ?? [],
    variants: p.variants ?? [],
  }))

  return { rows, total: count ?? 0 }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const addAdminProduct = async (data: AddProductPayload) => {
  const supabase = await createClient()

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
  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return result as number
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateAdminProduct = async (
  productId: number,
  data: UpdateProductPayload,
) => {
  const supabase = await createClient()

  const payload = {
    product_id: productId,
    name: data.name,
    slug: data.slug,
    description: data.description,
    status: data.status,
    discount: data.discount,
    category_id: data.category_id,
    type: data.type,
    details: data.product_details ?? [],
    deleted_detail_ids: data.deleted_detail_ids ?? [],
    deleted_variant_ids: data.deleted_variant_ids ?? [],
    variants: data.variants.map((v) => ({
      ...(v.variant_id ? { variant_id: v.variant_id } : {}),
      price: v.price,
      stock: v.stock,
      is_active: v.is_active,
      pricing_tiers: (v.pricing_tiers ?? []).map((t) => ({
        ...(t.id ? { id: t.id } : {}),
        label: t.label,
        min_quantity: t.min_quantity,
        discount_percent: t.discount_percent,
      })),
      deleted_tier_ids: v.deleted_tier_ids ?? [],
      attributes: (v.attributes ?? []).map((a) => ({
        ...(a.id ? { id: a.id } : {}),
        attribute_name: a.attribute_name,
        attribute_value: a.attribute_value,
      })),
      deleted_attribute_ids: v.deleted_attribute_ids ?? [],
      images: v.images,
      deleted_image_paths: v.deleted_image_paths ?? [],
    })),
  }

  const { data: result, error } = await supabase.rpc('update_admin_product', { payload })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return result as number
}

// ─── RESTORE ──────────────────────────────────────────────────────────────────

export const restoreProduct = async (productId: number) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
    .eq('product_id', productId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return productId
}

// ─── SOFT DELETE ──────────────────────────────────────────────────────────────

export const softDeleteProduct = async (productId: number) => {
  const supabase = await createClient()

  const { count, error: countError } = await supabase
    .from('products')
    .select('product_id', { count: 'exact', head: true })
    .eq('product_id', productId)

  if (countError) throw new Error(countError.message)
  if (!count || count === 0) throw new Error('Product not found')

  const { error } = await supabase
    .from('products')
    .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
    .eq('product_id', productId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return productId
}
