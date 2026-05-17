export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'HIDDEN' | 'ARCHIVED'

export type PricingTier = {
  label: string
  min_quantity: number
  discount_percent: number
  computed_price?: number
}

export type ProductCatalogItem = {
  product_id: number
  name: string
  slug: string
  discount: number | null
  category_id: number | null
  category_name: string | null
  base_price: number
  final_price: number
  image_url: string | null
  has_wholesale: boolean
  wholesale_min_qty: number | null
  wholesale_discount_percent: number | null
  wholesale_price: number | null
}

export type ProductDetails = {
  product_id: number
  name: string
  description: string | null
  slug: string
  discount: number | null
  status: ProductStatus

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
    pricing_tiers: PricingTier[]
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
  type: string
  status: ProductStatus   
  discount: number

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
    pricing_tiers: PricingTier[]

    images: string[]

    attributes: {
      id?: number
      name: string
      value: string
    }[]
  }[]
}

export type UpdateProductPayload = {
  name?: string
  description?: string | null
  slug?: string
  status?: ProductStatus
  discount?: number | null
  category_id?: number | null
  product_details?: {
    id?: number
    attribute_name: string
    attribute_value: string
  }[]
  deleted_detail_ids?: number[]
}

export type UpdateVariantPayload = {
  sku?: string
  price?: number
  stock?: number
  is_active?: boolean
  attributes?: {
    id?: number
    name: string
    value: string
  }[]
  pricing_tiers?: {
    id?: number
    min_quantity: number
    label: string
    discount_percent: number
    is_active: boolean
  }[]
  deleted_tier_ids?: number[]
  deleted_attribute_ids?: number[]
}