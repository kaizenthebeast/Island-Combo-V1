export type Category = {
    id: string
    name: string
}

export type VariantAttribute = {
    id: string
    attribute_name: string
    attribute_value: string
}

export type Variant = {
    id: string
    sku: string
    price: number
    stock: number
    image_url: string
    final_price: number
    variant_attributes: VariantAttribute[]
}

export type Product = {
    id: string
    name: string
    description: string | null
    slug: string
    discount: number
    wholesale: boolean
    is_active: boolean
    created_at: string
    category: Category

    variants: Variant[]

    lowest_price: number
}
