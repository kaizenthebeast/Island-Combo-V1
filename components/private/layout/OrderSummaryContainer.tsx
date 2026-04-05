'use client'
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCartStore } from '@/store/cartStore';

const OrderSummaryContainer = () => {
  const { cart, fetchCart, updateItem, removeItem } = useCartStore();
  const { register, setValue } = useForm<{ [key: string]: number }>({
    defaultValues: {},
  });

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Sync form values whenever cart changes
  useEffect(() => {
    cart.forEach(item => {
      setValue(item.product_id, item.quantity, { shouldDirty: false, shouldValidate: false });
    });
  }, [cart, setValue]);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

      <div className="space-y-4">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center justify-between border-b pb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-md mr-4 flex-shrink-0"></div>

            <div className="flex-1">
              <p className="font-semibold">{item.products?.name}</p>
              <p className="text-gray-500">${item.products?.price}</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                {...register(item.product_id)}
                className="w-16 border rounded p-1 text-center no-spinner"
                onBlur={(e) =>
                  updateItem(item.product_id, Number(e.currentTarget.value))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateItem(item.product_id, Number(e.currentTarget.value));
                    e.currentTarget.blur();
                  }
                }}
              />
              <button
                className="text-red-500 hover:text-red-700 font-semibold"
                onClick={() => removeItem(item.product_id)}
              >
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
