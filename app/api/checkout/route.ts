import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { findPromoCode } from "@/lib/checkout";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { promoCode, existingPromo } = body;

    if (!promoCode) {
      return NextResponse.json(
        { error: "Promo code is required" },
        { status: 400 }
      );
    }

    if (existingPromo) {
      return NextResponse.json(
        { error: "Only one promo code can be applied" },
        { status: 400 }
      );
    }

    const promo = await findPromoCode(promoCode);

    if (!promo) {
      return NextResponse.json(
        { error: "Invalid or expired promo code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      promo,
    });

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
