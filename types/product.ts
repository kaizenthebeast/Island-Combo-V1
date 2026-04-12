export type Category = {
    id: string
    name: string
}

export type Variant = {
    id: string
    sku: string
    price: number
    stock: number
    image_url: string 
    final_price: number
}
export type VariantAttribute = {
  attribute_name: string
  attribute_value: string
}

export type DefaultVariant = Variant

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
    default_variant: DefaultVariant
    variants: Variant[]
    lowest_price: number
}
