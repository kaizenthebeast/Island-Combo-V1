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

  product_details: {
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


export type AdminProduct = {
  product_id: number
  name: string
  slug: string
  description: string | null

  is_active: boolean
  wholesale: boolean
  discount: number | null

  category: {
    category_id: number
    name: string
  } | null

  base_price: number
  created_at: string
  updated_at: string

  images: string[]

  product_details: {
    id?: number
    attribute_name: string
    attribute_value: string
  }[]

  variants: {
    variant_id: number
    sku: string

    price: number
    discount: number | null
    final_price: number

    stock: number
    low_stock_threshold?: number

    is_active: boolean

    images: string[]

    attributes: {
      id?: number
      name: string
      value: string
    }[]
  }[]
}