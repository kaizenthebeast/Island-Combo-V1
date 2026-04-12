import { createClient } from './supabase/server'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
import type {Variant, Product} from '@/types/product'



function mapProduct(product: Product): Product {
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        slug: product.slug,
        discount: product.discount,
        wholesale: product.wholesale,
        is_active: product.is_active,
        created_at: product.created_at,
        category: product.category,
        default_variant: product.default_variant
            ? {
                  ...product.default_variant,
                  image_url: getPublicImageUrl(product.default_variant.image_url),
              }
            : null,

        variants: (product.variants || []).map((v: Variant) => ({
            ...v,
            image_url: getPublicImageUrl(v.image_url),
        })),

        lowest_price: product.lowest_price,
    }
}

export async function getAllProducts(): Promise<Product[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('product_catalog_view')
        .select('*')

    if (error) throw new Error(error.message)

    return (data || []).map(mapProduct)
}

export async function getProductBySlug(slug: string): Promise<Product> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('product_catalog_view')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error) throw new Error(error.message)

    return mapProduct(data)
}