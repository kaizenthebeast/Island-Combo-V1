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
    const { data, error } = await supabase.rpc('get_product_by_slug', { p_slug })
    if (error) throw new Error(error.message)
    return data
}

export const getProductDetails = async (productId: number) => {
    const supabase = await createClient()
    const { data, error } = await supabase.from('product_details').select('*').eq('product_id', productId)
    if (error) {
        throw new Error(error.message)
    }
    return data;
}

