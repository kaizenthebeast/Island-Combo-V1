import { NextRequest, NextResponse } from "next/server";
import { requireUser } from '@/lib/auth'
import {  findPromoCode } from "@/lib/checkout";


export async function GET(req: NextRequest) {
    try {
        const user = await requireUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const promoCode = req.nextUrl.searchParams.get("code");

        if (!promoCode) {
            return NextResponse.json({ error: 'Promo code is missing' }, { status: 400 })
        }

        const data = await findPromoCode(promoCode)
        if (!data) {
            return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 400 })
        }

        return NextResponse.json(data, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
