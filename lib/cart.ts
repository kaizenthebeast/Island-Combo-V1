import { createClient } from '@/lib/supabase/server';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  slug: string;
  is_active: boolean;
  categories: Category[]; // ✅ array
}

export interface VariantAttribute {
  attribute_name: string;
  attribute_value: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  stock: number;
  image_url?: string;
  is_active: boolean;
  products: Product[]; // ✅ array
  variant_attributes: VariantAttribute[];
}

export interface CartItem {
  id: string;
  user_id: string;
  variant_id: string;
  quantity: number;
  added_at?: string;

  product_variants: ProductVariant[]; // ✅ array
}


export type CartItemInput = {
  userId: string;
  variantId: string;
  quantity?: number;
};


export async function getCart(userId: string): Promise<CartItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cart')
    .select(`
      id,
      user_id,
      variant_id,
      quantity,
      added_at,
      product_variants (
        id,
        sku,
        price,
        stock,
        image_url,
        is_active,
        products (
          id,
          name,
          description,
          slug,
          is_active,
          categories (
            id,
            name
          )
        ),
        variant_attributes (
          attribute_name,
          attribute_value
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  return data as CartItem[];
}


export async function addToCart(items: CartItemInput) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    'add_to_cart_increment',
    {
      p_user_id: items.userId,
      p_variant_id: items.variantId,
      p_quantity: items.quantity ?? 1,
    }
  );

  if (error) throw error;

  return data;
}


export async function updateCartQuantity(items: CartItemInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cart')
    .update({ quantity: items.quantity ?? 1 })
    .eq('user_id', items.userId)
    .eq('variant_id', items.variantId);

  if (error) throw error;

  return data;
}


export async function removeFromCart(items: CartItemInput) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', items.userId)
    .eq('variant_id', items.variantId);

  if (error) throw error;
}
