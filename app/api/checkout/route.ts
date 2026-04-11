import { NextRequest, NextResponse } from "next/server";
import { requireUser } from '@/lib/auth';
import { findPromoCode } from "@/lib/checkout";

type RequestBody = {
    promoCode: string;
    totalQty: number;
    subtotal: number;
};

export async function POST(req: NextRequest) {
    try {
        const user = await requireUser(); 
        if (!user) {
            return NextResponse.json(
                { error: "Access denied" },
                { status: 401 }
            );
        }

        const body: RequestBody = await req.json();
        const { promoCode, totalQty, subtotal } = body;

        if (!promoCode || !subtotal || totalQty == null) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const promo = await findPromoCode(promoCode);

        if (!promo) {
            return NextResponse.json(
                { error: "Invalid or expired promo code" },
                { status: 404 }
            );
        }

        if (totalQty < (promo.min_quantity || 0)) {
            return NextResponse.json(
                { error: `Minimum totalQty is ${promo.min_quantity}` },
                { status: 400 }
            );
        }

        let discount = 0;

        if (promo.type === "percent") {
            discount = (subtotal * promo.value) / 100;
        } else if (promo.type === "fixed") {
            discount = promo.value;
        }

        const finalTotal = Math.max(subtotal - discount, 0);

        return NextResponse.json({
            success: true,
            promo: promo.code,
            discount,
            finalTotal,
        });

    } catch (error: unknown) {
        const message =  error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}