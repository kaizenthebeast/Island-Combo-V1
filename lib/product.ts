'use server'
import { createClient } from './supabase/server'
import type { ProductCatalogItem, ProductDetails } from '@/types/product'

// PUBLIC

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

// PUBLIC PAGINATED LIST
// Backs `GET /api/product`. Supports descendant-aware category filter, price
// range, sort, pagination + limit. Returns rows + total + page metadata.

export type PublicProductSort = 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc'

export type PublicProductsPageInput = {
  categoryId?: number | null
  minPrice?: number | null
  maxPrice?: number | null
  sort?: PublicProductSort
  page?: number
  limit?: number
}

export type PublicProductsPageResult = {
  rows: ProductCatalogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const MAX_PAGE_SIZE = 100

export const getPublicProductsPage = async (
  input: PublicProductsPageInput = {},
): Promise<PublicProductsPageResult> => {
  const supabase = await createClient()

  const page = Math.max(1, Math.floor(input.page ?? 1))
  const limit = Math.min(Math.max(1, Math.floor(input.limit ?? 20)), MAX_PAGE_SIZE)
  const sort: PublicProductSort = input.sort ?? 'date_desc'

  let query = supabase.from('product_catalog_mv').select('*', { count: 'exact' })

  if (input.categoryId) {
    const { data: cats, error: catErr } = await supabase
      .from('category')
      .select('category_id, parent_id')
      .eq('is_active', true)
    if (catErr) throw new Error(catErr.message)
    const ids = collectCategoryDescendants(cats ?? [], input.categoryId)
    if (ids.length === 0) {
      return { rows: [], total: 0, page, limit, totalPages: 0 }
    }
    query = query.in('category_id', ids)
  }

  if (typeof input.minPrice === 'number') query = query.gte('final_price', input.minPrice)
  if (typeof input.maxPrice === 'number') query = query.lte('final_price', input.maxPrice)

  // The MV has no created_at, so product_id (IDENTITY = monotonic) proxies "date".
  switch (sort) {
    case 'price_asc':  query = query.order('final_price', { ascending: true }); break
    case 'price_desc': query = query.order('final_price', { ascending: false }); break
    case 'date_asc':   query = query.order('product_id', { ascending: true }); break
    case 'date_desc':
    default:           query = query.order('product_id', { ascending: false }); break
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const total = count ?? 0
  return {
    rows: data ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
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

export const getRecommendedProducts = async (
  productId: number,
  categoryId: number | null,
  limit = 12,
): Promise<ProductCatalogItem[]> => {
  const supabase = await createClient()

  const collected: ProductCatalogItem[] = []
  const seen = new Set<number>([productId])

  const take = (rows: ProductCatalogItem[]) => {
    for (const p of rows) {
      if (collected.length >= limit) break
      if (seen.has(p.product_id)) continue
      seen.add(p.product_id)
      collected.push(p)
    }
  }

  if (categoryId) {
    const { data, error } = await supabase
      .from('product_catalog_mv')
      .select('*')
      .eq('category_id', categoryId)
      .neq('product_id', productId)
      .order('product_id', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    take(data ?? [])
  }

  // Backfill with newest products when the category doesn't have enough.
  if (collected.length < limit) {
    const { data, error } = await supabase
      .from('product_catalog_mv')
      .select('*')
      .neq('product_id', productId)
      .order('product_id', { ascending: false })
      .limit(limit * 2)
    if (error) throw new Error(error.message)
    take(data ?? [])
  }

  return collected
}

export const getProductBySlug = async (p_slug: string): Promise<ProductDetails> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_product_by_slug', { p_slug })
  if (error) throw new Error(error.message)
  return data
}
