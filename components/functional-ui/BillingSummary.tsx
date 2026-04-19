'use client';

import React, { useMemo, useState } from 'react';
import { CircleDollarSign } from "lucide-react";
import PromoCodeForm from '../forms/PromoCodeForm';

type Promo = {
    code: string;
    value: number;
    min_quantity: number | null;
    expires_at: string | null;
};

type Props = {
    totalQty: number;
    subtotal: number;
};

const BillingSummary = ({ totalQty, subtotal }: Props) => {
    const [promo, setPromo] = useState<Promo | null>(null);
    const [loyalty, setLoyalty] = useState(true);
    const handleSetPromo = (newPromo: Promo | null) => {
        setPromo(newPromo);
    };

    const discount = useMemo(() => {
        if (!promo) return 0;
        return (subtotal * promo.value) / 100;
    }, [promo, subtotal]);

    const loyaltyDiscount = loyalty ? 3 : 0;

    const total = useMemo(() => {
        return subtotal - discount - loyaltyDiscount;
    }, [subtotal, discount, loyaltyDiscount]);

    return (
        <div className="bg-gray-50 rounded-2xl p-5 space-y-6">

            {/* PROMO */}
            <PromoCodeForm
                setPromo={handleSetPromo}
                activePromo={promo}
            />

            {/* LOYALTY */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 p-2 rounded-full">
                        <CircleDollarSign className="text-yellow-600" size={18} />
                    </div>

                    <div>
                        <p className="text-sm font-medium">
                            300 Loyalty Points ($3)
                        </p>
                        <p className="text-xs text-[#900036]">
                            Custom loyalty points to use
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setLoyalty(!loyalty)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition 
            ${loyalty ? "bg-[#900036]" : "bg-gray-300"}`}
                >
                    <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${loyalty ? "translate-x-5" : ""
                            }`}
                    />
                </button>
            </div>

            <hr />

            {/* SUMMARY */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Billing Summary</h3>

                <div className="space-y-3 text-sm">

                    <div className="flex justify-between text-gray-700">
                        <span>Subtotal ({totalQty} items)</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>- ${discount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-green-600">
                        <span>Loyalty points</span>
                        <span>- ${loyaltyDiscount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-gray-400">
                        <span>Shipping fee</span>
                        <span>Calculated at checkout</span>
                    </div>

                </div>

                <hr />

                {/* TOTAL */}
                <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-gray-800">
                        ${total.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* CHECKOUT */}
            <button
                type="button"
                className="w-full bg-[#900036] text-white py-3 rounded-full font-medium hover:opacity-90 transition"
            >
                Checkout
            </button>

        </div>
    );
};

export default BillingSummary;
