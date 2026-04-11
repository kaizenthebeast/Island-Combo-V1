
import { createClient } from './supabase/server'

export type ProductProps = {
    name: string
    price: number
    description?: string
    categoryId?: string
    stock?: number
    isActive?: boolean
    slug?: string
}

export async function getAllProducts() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('products')
        .select(`
      id,
      name,
      image_url,
      price,
      description,
      discount,
      wholesale,
      slug,
      search_vector,
      is_active,
      category:categories(name)
    `)
        .eq('is_active', true)

    if (error) {
        throw new Error(error.message)
    }

    //Convert storage path -> public url
    const products = data?.map((product) => {
        const imagePath = product.image_url?.[0]

        const imageUrl = imagePath
            ? supabase.storage.from('Product images').getPublicUrl(imagePath).data.publicUrl
            : '/images/placeholder.png'

        const discount = product.discount
        const oldPrice = product.price

        const finalPrice =
            discount > 0
                ? product.price - (product.price * discount / 100)
                : product.price

        return {
            ...product,
            imageUrl,
            price: finalPrice,
            oldPrice,
        }
    })

    return products
}

export async function getProductBySlug(slug: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            price,
            description,
            image_url,
            discount,
            slug
        `)
        .eq('slug', slug)
        .single()

    if (error) throw new Error(error.message)

    return data
}