'use client'
import React, { useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { UserProfile } from '@/lib/users';

interface CheckoutCardProps {
    user: UserProfile;
}
const CheckoutCard = ({ user }: CheckoutCardProps) => {
    const { cart, fetchCart } = useCartStore();
    useEffect(() => {
        fetchCart();
    }, [fetchCart])

    //calculate total
    const total = cart.reduce((sum, item) => sum + Number(item.products?.price || 0) * item.quantity, 0)

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">
            {/* Billing Sumamry */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Billing Summary</h2>
                {cart.map((item) => (
                    <div className="space-y-4" key={item.id}>
                        <div className="flex justify-between border-b pb-2">
                            <span>{item.products?.name}</span>
                            <span>${((item.products?.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                <div className='flex justify-between font-bold pt-2'>
                    <span>Discount</span>
                </div>
                {cart.length > 0 && (
                    <div className="flex justify-between font-bold pt-2">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                )}
            </section>

            {/* User Info */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Full Name"
                        defaultValue={user.full_name || ''}
                        className="border p-2 rounded w-full sm:col-span-2"
                        readOnly
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        defaultValue={user.email || ''}
                        className="border p-2 rounded w-full sm:col-span-2"
                        readOnly
                    />
                    <input
                        type="text"
                        placeholder="Address"
                        defaultValue={user.address || ''}
                        className="border p-2 rounded w-full sm:col-span-2"
                        readOnly
                    />
                </div>
            </section>

            {/* Payment Method */}
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

            {/* Place Order */}
            <section className="w-full">
                <button className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full">
                    Place Order
                </button>
            </section>
        </div>

    );
};

export default CheckoutCard;