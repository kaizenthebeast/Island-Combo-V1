import { createClient } from './supabase/server'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import type { ProductCatalogItem, ProductDetails } from '@/types/product'



function mapCatalogProduct(product: ProductCatalogItem): ProductCatalogItem {
    return {
        product_id: product.product_id,
        name: product.name,
        slug: product.slug,
        wholesale: product.wholesale,
        discount: product.discount,

        category_id: product.category_id,
        category_name: product.category_name,

        base_price: product.base_price,
        final_price: product.final_price,
        image_url: product.image_url
            ? getPublicImageUrl(product.image_url)
            : null,
    }
}


function mapProductDetails(product: ProductDetails): ProductDetails {
    return {
        product_id: product.product_id,
        name: product.name,
        description: product.description,
        slug: product.slug,
        discount: product.discount,
        wholesale: product.wholesale,
        is_active: product.is_active,
        category: product.category,

        variants: (product.variants || []).map((v) => ({
            variant_id: v.variant_id,
            sku: v.sku,
            price: v.price,
            final_price: v.final_price,
            stock: v.stock,

            // DB → storage → public URL
            image_url: v.image_url?.length
                ? v.image_url.map((img) =>
                    getPublicImageUrl(img) ?? '/images/placeholder.png'
                  )
                : ['/images/placeholder.png'],

            is_active: v.is_active,

            attributes: v.attributes || [],
        })),
    }
}


export async function getAllProducts(): Promise<ProductCatalogItem[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('product_catalog_mv')
        .select('*')

    if (error) throw new Error(error.message)

    return (data ?? []).map(mapCatalogProduct)
}



export async function getProductBySlug(p_slug: string): Promise<ProductDetails> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .rpc('get_product_details', {p_slug})

    if (error) throw new Error(error.message)

    return mapProductDetails(data)
}

