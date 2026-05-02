import { NextRequest, NextResponse } from "next/server"
import { requireUser } from '@/lib/auth'
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
} from "@/lib/cart"

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const cart = await getCart(user.id)
    return NextResponse.json(cart)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { variantId, quantity, selectedOption } = await req.json()

    // selectedOption is intentionally optional — null for no-attribute products
    if (!variantId || !quantity) {
      return NextResponse.json(
        { error: "variantId and quantity are required" },
        { status: 400 }
      )
    }

    const data = await addToCart({
      userId: user.id,
      variantId,
      quantity,
      selectedOption: selectedOption ?? null,
    })
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error("API CART ERROR:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { variantId, quantity } = await req.json()

    if (!variantId) {
      return NextResponse.json(
        { error: "variantId is required" },
        { status: 400 }
      )
    }
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      )
    }

    const data = await updateCartQuantity({
      userId: user.id,
      variantId,
      quantity,
    })
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { variantId } = await req.json()

    if (!variantId) {
      return NextResponse.json(
        { error: "variantId is required" },
        { status: 400 }
      )
    }

    await removeFromCart({
      userId: user.id,
      variantId,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}