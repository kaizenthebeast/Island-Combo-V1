'use server'
import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProductCatalogItem, ProductDetails, AdminProduct } from '@/types/product'
import type { VariantWithUploadedImages } from './product-upload'
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
  deleted_detail_ids?: number[]   // ← was missing
  deleted_variant_ids?: number[]  // ← was missing
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
    deleted_tier_ids?: number[]       // ← was missing
    attributes?: {
      id?: number
      attribute_name: string
      attribute_value: string
    }[]
    deleted_attribute_ids?: number[]  // ← was missing
    images: string[]
    deleted_image_paths?: string[]
  }[]
}

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

export const getAllProducts = async (
  opts?: { categoryId?: number | null; sort?: 'latest' },
): Promise<ProductCatalogItem[]> => {
  const supabase = await createClient()

  let query = supabase.from('product_catalog_mv').select('*')

  if (opts?.categoryId) {
    const { data: cats, error: catErr } = await supabase
      .from('category')
      .select('category_id, parent_id')
      .eq('is_active', true)

    if (catErr) throw new Error(catErr.message)

    const ids = collectCategoryDescendants(cats ?? [], opts.categoryId)
    if (ids.length === 0) return []
    query = query.in('category_id', ids)
  }

  if (opts?.sort === 'latest') {
    // product_id is an IDENTITY column, so DESC == newest-first without
    // needing created_at in the materialized view.
    query = query.order('product_id', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

function collectCategoryDescendants(
  cats: { category_id: number; parent_id: number | null }[],
  rootId: number,
): number[] {
  const childrenByParent = new Map<number, number[]>()
  for (const c of cats) {
    if (c.parent_id !== null) {
      const arr = childrenByParent.get(c.parent_id) ?? []
      arr.push(c.category_id)
      childrenByParent.set(c.parent_id, arr)
    }
  }

  const result: number[] = []
  const stack: number[] = [rootId]
  const seen = new Set<number>()
  while (stack.length > 0) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
    const children = childrenByParent.get(id)
    if (children) stack.push(...children)
  }
  return result
}

export const getSaleProducts = async (
  limit = 12,
): Promise<ProductCatalogItem[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_catalog_mv')
    .select('*')
    .gt('discount', 0)
    .order('discount', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
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

// ─── ADMIN — READ (paginated) ─────────────────────────────────────────────────

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

// ─── ADMIN — UPDATE ───────────────────────────────────────────────────────────

export const updateAdminProduct = async (
  productId: number,
  data: UpdateProductPayload
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

// ─── ADMIN — RESTORE ──────────────────────────────────────────────────────────

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

// ─── ADMIN — SOFT DELETE ──────────────────────────────────────────────────────

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