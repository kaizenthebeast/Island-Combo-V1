import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getCart, findPromoCode, calculateTotalCart } from "@/lib/checkout"

export async function POST(req: NextRequest) {
  try {
    // check auth user
    const user = await requireUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }

    // get the value of promo
    const { promoCode } = await req.json();
    // get the value of the cart of that user
    const cart = await getCart(user.id)
    //check if the promo code is existing
    const promo = promoCode ? await findPromoCode(promoCode) : null

    //get the total
    const totals = await calculateTotalCart(cart, promo || undefined)

    //validation
    if (promoCode && !totals.promoValid) {
      return NextResponse.json(
        { error: "Code is not valid for current cart" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      totals,
      cart,
      promo
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}