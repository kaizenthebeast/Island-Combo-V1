'use client'
import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { UserProfile } from '@/lib/users';
import { Button } from '../ui/button';
import { PromoModal } from '../functional-ui/PromoModal';

interface CheckoutCardProps {
    user: UserProfile;
}

const CheckoutCard = ({ user }: CheckoutCardProps) => {
    const { cart, fetchCart, totalQty, subtotal } = useCartStore();

    const [discount, setDiscount] = useState(0);
    const [finalTotal, setFinalTotal] = useState<number | null>(null);

    const displayTotal = finalTotal ?? subtotal;

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

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
                    <span>${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold pt-2">
                    <span>Discount</span>
                    <span>${discount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold pt-2">
                    <span>Total</span>
                    <span>${displayTotal.toFixed(2)}</span>
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
                <PromoModal setDiscount={setDiscount} setFinalTotal={setFinalTotal} totalQty={totalQty} subtotal={subtotal} />
                <Button size="lg" disabled={cart.length === 0}>
                    Place Order
                </Button>
            </section>
        </div>
    );
};

export default CheckoutCard;