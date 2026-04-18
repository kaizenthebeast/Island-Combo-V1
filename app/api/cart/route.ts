// app/api/cart/route.ts

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

    const { variantId, quantity, size } = await req.json()

    if (!variantId || !quantity || !size) {
      return NextResponse.json(
        { error: "variantId, quantity, and size are required" },
        { status: 400 }
      )
    }

    const data = await addToCart({
      userId: user.id,
      variantId,
      quantity,
      size,
    })

    return NextResponse.json(data)
  } catch (err: unknown) {
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

    const { variantId, quantity, size } = await req.json()

    if (!variantId || !size) {
      return NextResponse.json(
        { error: "variantId and size are required" },
        { status: 400 }
      )
    }

    const data = await updateCartQuantity({
      userId: user.id,
      variantId,
      quantity,
      size,
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

    const { variantId, size } = await req.json()

    if (!variantId || !size) {
      return NextResponse.json(
        { error: "variantId and size are required" },
        { status: 400 }
      )
    }

    await removeFromCart({
      userId: user.id,
      variantId,
      size,
      quantity: 0, // not needed but satisfies type
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
