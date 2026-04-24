'use client'

import React, { useState } from "react";
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button'
import { Separator } from "@/components/ui/separator";
import CheckoutAddress from "@/components/forms/CheckoutAddressForm";

const addresses = [
  {
    id: 1,
    name: "Jane Smith",
    isDefault: true,
    address: "123 Ocean Road, Kolonia, FM 96941, Federated States of Micronesia",
    phone: "0912345678",
  },
  {
    id: 2,
    name: "John Smith",
    isDefault: false,
    address: "17 Ocean Road, Kolonia, FM 96941, Federated States of Micronesia",
    phone: "0912345678",
  },
];


const AddressContainer = () => {
const [method, setMethod] = useState("deliver");

const handleMethodChange = (newMethod: string) => {
  setMethod(newMethod)
}

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <h2 className="title-header">How would you like to get your order?</h2>

      <div className="grid md:grid-cols-4 grid-cols-1 gap-10">
        <div className="md:col-span-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${method === "deliver" ? "bg-gray-200 text-pink-600" : "bg-gray-100 text-gray-500"}`}
              onClick={() => handleMethodChange("deliver")}
            >
              Deliver it
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${method === "pickup" ? "bg-gray-200 text-pink-600" : "bg-gray-100 text-gray-500"}`}
              onClick={() => handleMethodChange("pickup")}
            >
              Pick it up
            </button>
          </div>
          <div className="border rounded-md p-4 mt-6 shadow-md flex flex-col space-y-3">
            <h2 className="text-baseline font-bold">Saved Address</h2>
            {/* Address Selection */}
            {addresses.map((address) => (
              <div key={address.id} className="flex items-center justify-between" >
                {/* Details */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin />
                    <span>{address.name}</span>
                    {address.isDefault && (
                      <span className="bg-yellow-200 px-2 text-sm">Default</span>
                    )}
                  </div>
                  <div>
                    <p>{address.address}</p>
                    <p>{address.phone}</p>

                    <CheckoutAddress title="Edit Address">
                      <button type="button" className="mt-3 text-[#900036] font-bold" data-id={address.id}>
                        Edit
                      </button>
                    </CheckoutAddress>
                  </div>
                </div>

                {/* Radio Input */}
                <input
                  type="radio"
                  className="w-5 h-5 accent-pink-600"
                />
              </div>


            ))}
          </div>
          <CheckoutAddress title="Add New Address">
            <Button className="mt-4 rounded-full" variant="default">
              Add New Address
            </Button>
          </CheckoutAddress>

          <Separator className="my-12 bg-black" />
        </div>


        <div className="">
          {/* RIGHT SIDE */}
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