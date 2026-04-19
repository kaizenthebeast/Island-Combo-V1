import { createClient } from './supabase/server'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import type { ProductCatalogItem, ProductDetails } from '@/types/product'



function mapCatalogProduct(product: ProductCatalogItem): ProductCatalogItem {
    return {
        ...product,
        image_url: getPublicImageUrl(product.image_url),
    }
}

function mapProductDetails(product: ProductDetails): ProductDetails {
    return {
        ...product,

        variants: (product.variants || []).map((v) => ({
            ...v,

            image_url: v.image_url?.length
                ? v.image_url
                    .map(getPublicImageUrl)
                    .filter(Boolean) as string[]
                : ['/images/placeholder.png'],

            attributes: v.attributes || [],
        })),
    }
}


export async function getAllProducts(): Promise<ProductCatalogItem[]> {
    const supabase = await createClient()

    const { data, error } = await supabase.from('product_catalog_mv').select('*')

    if (error) throw new Error(error.message)

    return (data ?? []).map(mapCatalogProduct)
}



export async function getProductBySlug(p_slug: string): Promise<ProductDetails> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_product_details', { p_slug })

    if (error) throw new Error(error.message)

    return mapProductDetails(data)
}

