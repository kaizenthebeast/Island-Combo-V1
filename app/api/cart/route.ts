import { NextRequest, NextResponse } from "next/server";
import { requireUser } from '@/lib/auth'
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
} from "@/lib/cart";


export async function GET() {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cart = await getCart(user.id);
    return NextResponse.json(cart);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variantId, quantity } = await req.json();

    const data = await addToCart({
      userId: user.id,
      variantId,
      quantity,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variantId, quantity } = await req.json();

    const data = await updateCartQuantity({
      userId: user.id,
      variantId,
      quantity,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variantId } = await req.json();

    await removeFromCart({
      userId: user.id,
      variantId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}