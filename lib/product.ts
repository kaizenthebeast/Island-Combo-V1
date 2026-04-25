import { createClient } from './supabase/server'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import type { ProductCatalogItem, ProductDetails } from '@/types/product'

export const getAllProducts = async (): Promise<ProductCatalogItem[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase.from('product_catalog_mv').select('*')
    if (error) throw new Error(error.message)
    return data
}



export const getProductBySlug = async (p_slug: string): Promise<ProductDetails> => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_product_details', { p_slug })
    if (error) throw new Error(error.message)
    return data
}

