import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server'
import { getCart, addToCart, updateCartQuantity, removeFromCart } from '@/lib/cart'

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const cart = await getCart(user.id);
        return NextResponse.json(cart);
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


export async function POST(req: NextRequest) {
    const { productId, quantity } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const data = await addToCart({ userId: user.id, productId, quantity })
        return NextResponse.json(data)
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const { productId, quantity } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const data = await updateCartQuantity({ userId: user.id, productId, quantity })
        return NextResponse.json(data)
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { productId } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
        await removeFromCart({ userId: user.id, productId })
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}