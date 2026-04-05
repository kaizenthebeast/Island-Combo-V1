'use client'
import React from 'react';
import { useCartStore } from '@/store/cartStore';
import { CartItem } from '@/lib/cart';

interface OrderSummaryProps{
    cartItems: CartItem[]
}

const OrderSummaryContainer = ({cartItems}:OrderSummaryProps) => {
    const { updateItem, removeItem } = useCartStore();

    return (
        <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

            {/* Product List */}
            <div className="space-y-4">
                {cartItems.map((item) => (
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
                                defaultValue={1}
                                min={1}
                                onChange={(e) => updateItem(item.id, Number(e.target.value))}
                                className="w-16 border rounded p-1 text-center"
                            />
                            <button className="text-red-500 hover:text-red-700 font-semibold" onClick={() => removeItem(item.id)}>
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