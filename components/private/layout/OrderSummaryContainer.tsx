'use client'
import React, { useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';




const OrderSummaryContainer = () => {
    const { cart, fetchCart, updateItem, removeItem } = useCartStore();

    useEffect(() => {
        fetchCart();
    }, [fetchCart])

    return (
        <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

            {/* Product List */}
            <div className="space-y-4">
                {cart.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between border-b pb-4"
                    >
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-200 rounded-md mr-4 flex-shrink-0"></div>

                        {/* Product Info */}
                        <div className="flex-1">
                            <p className="font-semibold">{item.products?.name}</p>
                            <p className="text-gray-500">${item.products?.price}</p>
                        </div>

                        {/* Quantity Input & Remove */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                value={item.quantity}
                                min={1}
                                onChange={(e) => updateItem(item.product_id, Number(e.target.value))}
                                className="w-16 border rounded p-1 text-center no-spinner"
                            />
                            <button className="text-red-500 hover:text-red-700 font-semibold" onClick={() => removeItem(item.product_id)}>
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderSummaryContainer;