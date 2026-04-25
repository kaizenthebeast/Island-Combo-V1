'use client'

import React, { useState, useEffect, useCallback } from "react";
import { Address } from "@/types/users";
import CheckoutAddress from "@/components/forms/CheckoutAddressForm";
import AddressDetails from "@/components/functional-ui/checkout_address/AddressDetails";
import { getUserAddress } from "@/lib/users";

import { Button } from '@/components/ui/button'
import { Separator } from "@/components/ui/separator";

const AddressContainer = () => {
  const [method, setMethod] = useState("deliver");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const userAddresses = await getUserAddress();
      setAddresses(userAddresses);

      // auto-select the default address if none selected
      const defaultAddress = userAddresses.find((a) => a.make_default);
      if (defaultAddress && !selectedAddressId) {
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  }, [selectedAddressId]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <h2 className="title-header">How would you like to get your order?</h2>
      <div className="grid md:grid-cols-4 grid-cols-1 gap-10">
        <div className="md:col-span-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${method === "deliver" ? "bg-gray-200 text-pink-600" : "bg-gray-100 text-gray-500"}`}
              onClick={() => setMethod("deliver")}
            >
              Deliver it
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${method === "pickup" ? "bg-gray-200 text-pink-600" : "bg-gray-100 text-gray-500"}`}
              onClick={() => setMethod("pickup")}
            >
              Pick it up
            </button>
          </div>

          <div className="border rounded-md p-4 mt-6 shadow-md flex flex-col space-y-3">
            <h2 className="text-base font-bold">Saved Address</h2>

            {addresses.length === 0 && (
              <p className="text-sm text-gray-500">No saved addresses found. Please add one.</p>
            )}

            {addresses.map((address) => (
              <div key={address.id} className="flex items-center justify-between">
                <AddressDetails
                  address={address}
                  selectedAddressId={selectedAddressId}
                  setSelectedAddressId={setSelectedAddressId}
                  onSuccess={fetchAddresses} 
                />
              </div>
            ))}
          </div>

          <CheckoutAddress
            title="Add New Address"
            action="add"
            onSuccess={fetchAddresses} 
          >
            <Button className="mt-4 rounded-full" variant="default">
              Add New Address
            </Button>
          </CheckoutAddress>

          <Separator className="my-12 bg-black" />
        </div>

        <div className="">
          <div className="w-full md:w-[350px]">
            <div className="bg-white p-5 rounded-xl border space-y-4 sticky top-4">
              <h2 className="font-semibold">Order Summary</h2>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal (14 items)</span>
                <span>$81,589.00</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Discount</span>
                <span className="text-green-600">-$31,500.00</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Loyalty points</span>
                <span>-$3.00</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping fee</span>
                <span>$50.00</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-pink-600">$61,009.00</span>
              </div>
              <button className="w-full bg-pink-700 text-white py-3 rounded-full mt-2">
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressContainer;