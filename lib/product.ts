import { createClient } from './supabase/server'
import type { ProductCatalogItem, ProductDetails, AdminProduct } from '@/types/product'

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


// ADMIN SIDE
export const getAdminProducts = async (): Promise<AdminProduct[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // ensure JSON fields are arrays (safety)
  return (data ?? []).map((p) => ({
    ...p,
    product_details: p.product_details ?? [],
    variants: p.variants ?? [],
  }))
}

export const getAdminProductById = async (
  productId: number
): Promise<AdminProduct | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .eq('product_id', productId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no rows
    throw new Error(error.message)
  }

  return {
    ...data,
    product_details: data.product_details ?? [],
    variants: data.variants ?? [],
  }
}
