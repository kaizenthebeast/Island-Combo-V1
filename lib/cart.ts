import { createClient } from '@/lib/supabase/server';

export type CartOwner = {
    type: 'user' | 'guest';
    id: string;
};

// Fetch the items from the cart based on the getOwner function in api
export async function getUserCart(owner: CartOwner) {
    const supabase = await createClient();
    const query = supabase.from('cart').select('*');
    const { data, error } = await query.eq(owner.type === 'user' ? 'user_id' : 'guest_id', owner.id);

    if (error) throw new Error(error.message);
    return data;
}

//Call this function upon login / sign up 
export async function mergeCart(guestId: string, userId: string) {
    const supabase = await createClient();
    const { error } = await supabase.rpc('merge_cart', {
        p_guest_id: guestId,
        p_user_id: userId
    });
    if (error) throw new Error(error.message);
}


export async function addProductToCart(productId: string, quantity: number, owner: CartOwner) {
    const supabase = await createClient();

    // Check who's user is currently adding an item to the cart
    const { data: existing, error } = await supabase.from('cart')
        .select('*')
        .eq(owner.type === 'user' ? 'user_id' : 'guest_id', owner.id)
        .eq('product_id', productId)

    if (error) {
        throw new Error(error.message)
    }

    if (existing?.length) {
        await supabase.from('cart').update({ quantity: existing[0].quantity + quantity })
        .eq(owner.type === 'user' ? 'user_id' : 'guest_id', owner.id)
        .eq('product_id', productId)
    } else {
        await supabase.from('cart').insert([{
            product_id: productId,
            quantity: quantity,
            user_id: owner.type === 'user' ? owner.id : null,
            guest_id: owner.type === 'guest' ? owner.id : null,
        }])
    }

}

export async function removeProductFromCart(productId: string, owner: CartOwner) {
    const supabase = await createClient();
    await supabase
        .from('cart')
        .delete()
        .eq(owner.type === 'user' ? 'user_id' : 'guest_id', owner.id)
        .eq('product_id', productId);
}