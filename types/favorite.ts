export type Favorite = {
  id: number;
  user_id: string;
  product_id: number;
  created_at: string;
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
  wholesale: boolean;
  is_active: boolean;
  type: string | null;

  // Category
  category_id: number | null;
  category_name: string | null;

  // Variant
  variant_id: number | null;
  sku: string | null;
  price: number | null;
  stock: number | null;

  // Image
  primary_image: string | null;
};

export type AddFavoritePayload = {
  product_id: number;
};