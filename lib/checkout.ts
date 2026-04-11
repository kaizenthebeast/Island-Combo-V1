import { createClient } from './supabase/server';
import { CartItem } from './cart';
import { calculateCartTotals } from '@/helper/cartUtils'

export type Promo = {
    code: string
    type: "fixed" | "percentage"
    value: number
    min_quantity: number
    expires_at: string | null
}

//Get user cart
export async function getCart(userId: string): Promise<CartItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("cart")
    .select(`
      id,
      user_id,
      product_id,
      quantity,
      added_at,
      products:products (
        id,
        name,
        description,
        price,
        image_url,
        stock,
        is_active,
        slug,
        category_id
      )
    `)
    .eq("user_id", userId)

  if (error) throw new Error(error.message)

  return data as unknown as CartItem[]
}

//Find the promo 
export async function findPromoCode(promoCode: string) {
    const supabase = await createClient()

    // Voucher
    const { data, error } = await supabase
        .from('vouchers')
        .select('code, type, value, min_quantity, expires_at')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)

    if (error) throw new Error(error.message)

    if (!data || data.length === 0) return null

    const now = new Date()

    const validPromo = data.find((p) => {
        if (!p.expires_at) return true
        return new Date(p.expires_at) > now
    })

    return validPromo ?? null
}

// Calculate the totalCart
export async function calculateTotalCart(cart: CartItem[], promo?: Promo) {
    const { subtotal, totalQty } = calculateCartTotals(cart);
    let discount = 0
    let promoValid = false

    if (promo) {
        if (totalQty >= promo.min_quantity) {
            promoValid = true;
            if (promo.type === "fixed") {
                discount = promo.value
            } else {
                discount = subtotal * (promo.value / 100);
            }
        }

    }

    return {
        subtotal,
        totalQty,
        discount: Math.min(discount, subtotal),
        total: Math.max(subtotal - discount, 0),
        promoValid
    }
}


