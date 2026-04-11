import { createClient } from './supabase/server';
import { CartItem } from './cart';
import { UserProfile } from './users';


// add cart item to order item
export async function createOrderFromCart(cart: CartItem[], user: UserProfile, discount = 0, discountType: string, promoCode?: string,) {
    if (!cart.length) throw new Error('Cart is empty');
    const supabase = await createClient();
    const subtotal = cart.reduce((sum, item) => sum + item.products.price * item.quantity, 0);

    //Create a new order (immutable once created)
    const { data: newOrder, error: orderError } = await supabase.from('orders')
        .insert({
            user_id: user.user_id,
            total_amount: subtotal - discount,
            shipping_address: user.address,
            phone_number: user.phone,
            discount_amount: discount,
            discount_type: discountType,
            promo_code: promoCode,
            status: 'pending'
        }).select().single()

    if (orderError || !newOrder) {
        throw new Error(orderError?.message);
    }

    const orderId = newOrder.id

    //Create order items and linked to the orderId
    const { error: errorOrderItem } = await supabase.from('order_items').insert(
        cart.map((item) => ({
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.products?.price
        }))
    )
    if (errorOrderItem) {
        throw new Error(errorOrderItem.message)
    }


}

//Find the promo 
export async function findPromoCode(promoCode: string) {
    const supabase = await createClient()


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