import React from 'react';
import { User } from "@/lib/users";
import { getCart } from '@/lib/cart'

const CheckoutCard = async () => {
    const user = await User.current();
    const cartItems = await getCart(user.user_id);

    //calculate total
    const total = cartItems.reduce((sum, item) => sum + Number(item.products?.price || 0) * item.quantity, 0)
    return (
            <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-6">Checkout</h1>

                {/* Cart Summary */}
                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Cart Summary</h2>
                    {cartItems.map((item) => (
                        <div className="space-y-4" key={item.id}>
                            <div className="flex justify-between border-b pb-2">
                                <span>{item.products?.name}</span>
                                <span>${((item.products?.price || 0) * item.quantity).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                    {cartItems.length > 0 && (
                        <div className="flex justify-between font-bold pt-2">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    )}
                </section>

                {/* Billing Info */}
                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="First Name"
                            className="border p-2 rounded w-full"
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            className="border p-2 rounded w-full"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            className="border p-2 rounded w-full sm:col-span-2"
                        />
                        <input
                            type="text"
                            placeholder="Address"
                            className="border p-2 rounded w-full sm:col-span-2"
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
                <section className="text-right">
                    <button className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
                        Place Order
                    </button>
                </section>
            </div>
       
    );
};

export default CheckoutCard;