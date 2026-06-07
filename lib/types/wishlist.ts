/** Shared wishlist types. */
export type Wishlist = {
  id: number;
  user_id: string;
  product_id: number;
  created_at: string;
};

export type WishlistVariantAttribute = {
  name: string;
  value: string;
};

export type WishlistPricingTier = {
  label: string;
  min_quantity: number;
  discount_percent: number;
  computed_price: number;
};

export type WishlistVariant = {
  variant_id: number;
  sku: string | null;
  price: number;
  final_price: number;
  stock: number;
  pricing_tiers: WishlistPricingTier[];
  image_url: string[];
  attributes: WishlistVariantAttribute[];
};

export type WishlistCategory = {
  category_id: number | null;
  name: string | null;
};

export type WishlistView = {
  wishlist_id: number;
  user_id: string;
  wishlisted_at: string;

  // Product
  product_id: number;
  product_name: string;
  description: string | null;
  slug: string;
  discount: number | null;
  is_active: boolean;
  type: string | null;

  // Category
  category: WishlistCategory | null;

  // Variants
  variants: WishlistVariant[];

  // Image
  primary_image: string | null;
};

export type AddWishlistPayload = {
  product_id: number;
};
