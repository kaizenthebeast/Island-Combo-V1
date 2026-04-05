// components/cart/OrderSummaryContainer.tsx
import React from 'react';

const OrderSummaryContainer = () => {
    return (
        <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

            {/* Product List */}
            <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                    <div
                        key={item}
                        className="flex items-center justify-between border-b pb-4"
                    >
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-200 rounded-md mr-4 flex-shrink-0"></div>

                        {/* Product Info */}
                        <div className="flex-1">
                            <p className="font-semibold">Product Name</p>
                            <p className="text-gray-500">$XX.XX</p>
                        </div>

                        {/* Quantity Input & Remove */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                defaultValue={1}
                                min={1}
                                className="w-16 border rounded p-1 text-center"
                            />
                            <button className="text-red-500 hover:text-red-700 font-semibold">
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