export type ProductCatalogItem = {
  product_id: number
  name: string
  slug: string
  wholesale: boolean
  discount: number | null
  category_id: number | null
  category_name: string | null
  base_price: number
  final_price: number
  image_url: string | null
}


export type ProductDetails = {
  product_id: number
  name: string
  description: string | null
  slug: string
  discount: number | null
  wholesale: boolean
  is_active: boolean

  category: {
    category_id: number
    name: string
  } | null

  product_details: {         // ← add this
    attribute_name: string
    attribute_value: string
  }[]

  variants: {
    variant_id: number
    sku: string
    price: number
    final_price: number
    stock: number
    image_url: string[]
    attributes: {
      name: string
      value: string
    }[]
  }[]
}