'use client'
import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { UserProfile } from '@/lib/users';
import { Button } from '../ui/button';
import { PromoModal } from '../functional-ui/PromoModal';

interface CheckoutCardProps {
    user: UserProfile;
}

type CheckoutState = {
    subtotal: number
    discount: number
    total: number
}

const CheckoutCard = ({ user }: CheckoutCardProps) => {
    const { cart, fetchCart, subtotal } = useCartStore()
    const [checkout, setCheckout] = useState<CheckoutState>({
        subtotal: 0,
        discount: 0,
        total: 0,
    })

    const [promoCode, setPromoCode] = useState<string | null>(null);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    useEffect(() => {
        if (!promoCode) {
            setCheckout({
                subtotal,
                discount: 0,
                total: subtotal
            })
        }
    }, [subtotal, promoCode])

    //Revalidate promo on cart change
    useEffect(() => {
         if (!promoCode) return

        const revalidate = async () => {
            try {
                const res = await fetch('/api/checkout', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ promoCode }),
                })

                const body = await res.json();
                if (!res.ok) {
                    setPromoCode(null)
                    setCheckout({
                        subtotal,
                        discount: 0,
                        total: subtotal
                    })
                    return
                }
                setCheckout(body.totals)
            } catch {
                // fallback
                setCheckout({
                    subtotal,
                    discount: 0,
                    total: subtotal
                })
            }
        }
        revalidate();

    }, [subtotal, promoCode])

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">

            {/* Billing Summary */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Billing Summary</h2>

                {cart.map((item) => (
                    <div className="space-y-4" key={item.id}>
                        <div className="flex justify-between border-b pb-2">
                            <span>{item.products?.name}</span>
                            <span>{item.quantity} × ${item.products?.price.toFixed(2)}</span>
                        </div>
                    </div>
                ))}

                <div className="flex justify-between font-bold pt-2">
                    <span>Subtotal</span>
                    <span>${checkout.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold pt-2">
                    <span>Discount</span>
                    <span>${checkout.discount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold pt-2">
                    <span>Total</span>
                    <span>${checkout.total.toFixed(2)}</span>
                </div>
            </section>

            {/* User Info */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Billing Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                        type="text"
                        defaultValue={user.full_name || ''}
                        className="border p-2 rounded w-full sm:col-span-2"
                        readOnly
                    />
                    <input
                        type="email"
                        defaultValue={user.email || ''}
                        className="border p-2 rounded w-full sm:col-span-2"
                        readOnly
                    />
                    <input
                        type="text"
                        defaultValue={user.address || ''}
                        className="border p-2 rounded w-full sm:col-span-2"
                        readOnly
                    />
                </div>
            </section>

            {/* Payment */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>

                <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                        <input type="radio" name="payment" />
                        <span>Cash on delivery</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input type="radio" name="payment" />
                        <span>PayPal</span>
                    </label>
                </div>
            </section>

            {/* Actions */}
            <section className="w-full flex flex-col space-y-3">
                <PromoModal setCheckout={setCheckout} setPromoCode={setPromoCode} />
                <Button size="lg" disabled={cart.length === 0}>
                    Place Order
                </Button>
            </section>
        </div>
    );
};

export default CheckoutCard;