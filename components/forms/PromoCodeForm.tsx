"use client";

import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";

type FormValues = {
    promoCode: string;
};

type Promo = {
    code: string;
    value: number;
    min_quantity: number | null;
    expires_at: string | null;
};

type Props = {
    setPromo: (promo: Promo | null) => void;
    activePromo: Promo | null;
};

const PromoCodeForm = ({ setPromo, activePromo }: Props) => {
    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        reset,
        formState: { errors },
    } = useForm<FormValues>();

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!res.ok) {
            setPromo(null);
            setError("promoCode", {
                message: result.error || "Invalid promo code",
            });
            return;
        }

        clearErrors("promoCode");
        setPromo(result.promo);
        reset();
    };

    const removePromo = () => {
        setPromo(null);
        reset();
    };

    return (
        <div className="space-y-3">

            <h3 className="text-base font-semibold">Apply Promo Code</h3>

            {/* INPUT */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-3">
                <input
                    type="text"
                    placeholder="Promo code"
                    disabled={!!activePromo}
                    {...register("promoCode", {
                        required: "Promo code is required",
                        minLength: {
                            value: 3,
                            message: "Promo code must be at least 3 characters",
                        },
                    })}
                    className="flex-1 bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#900036] disabled:opacity-50"
                />

                <button
                    type="submit"
                    disabled={!!activePromo}
                    className="text-[#900036] font-medium text-sm disabled:opacity-50"
                >
                    Apply
                </button>
            </form>

            {/* ERROR */}
            {errors.promoCode && (
                <p className="text-sm text-red-500">
                    {errors.promoCode.message}
                </p>
            )}

            {/* ACTIVE PROMO */}
            {activePromo && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex justify-between items-center">
                    <div>
                        <p className="font-medium">{activePromo.code} applied</p>
                        <p>{activePromo.value}% discount applied</p>
                    </div>

                    {/* REMOVE PROMO */}
                    <button
                        type="button"
                        onClick={removePromo}
                        className="text-xs text-red-600 font-medium"
                    >
                        Remove
                    </button>
                </div>
            )}

        </div>
    );
};

export default PromoCodeForm;
