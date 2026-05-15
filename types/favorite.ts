export type Favorite = {
  id: number;
  user_id: string;
  product_id: number;
  created_at: string;
};

export type FavoriteVariantAttribute = {
  name: string;
  value: string;
};

export type FavoritePricingTier = {
  label: string;
  min_quantity: number;
  discount_percent: number;
  computed_price: number;
};

export type FavoriteVariant = {
  variant_id: number;
  sku: string | null;
  price: number;
  final_price: number;
  stock: number;
  pricing_tiers: FavoritePricingTier[];
  image_url: string[];
  attributes: FavoriteVariantAttribute[];
};

export type FavoriteCategory = {
  category_id: number | null;
  name: string | null;
};

export type FavoriteView = {
  favorite_id: number;
  user_id: string;
  favorited_at: string;

  // Product
  product_id: number;
  product_name: string;
  description: string | null;
  slug: string;
  discount: number | null;
  is_active: boolean;
  type: string | null;

  // Category
  category: FavoriteCategory | null;

  // Variants
  variants: FavoriteVariant[];

  // Image
  primary_image: string | null;
};

export type AddFavoritePayload = {
  product_id: number;
};