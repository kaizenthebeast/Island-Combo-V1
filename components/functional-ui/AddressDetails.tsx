'use client'
import React from "react";
import { Address } from "@/types/users";
import { MapPin } from 'lucide-react';
import CheckoutAddress from "../forms/CheckoutAddressForm";

const AddressDetails = ({
    address,
    selectedAddressId,
    setSelectedAddressId,
    onSuccess,
}: {
    address: Address;
    selectedAddressId: number | null;
    setSelectedAddressId: (id: number | null) => void;
    onSuccess?: () => void;
}) => {
    return (
        <>
            {/* Details */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <MapPin />
                    <span>{address.country}</span>
                    {address.make_default && (
                        <span className="bg-yellow-200 px-2 text-sm">Default</span>
                    )}
                </div>
                <div>
                    <p>{address.address}</p>
                    <p>{address.profile?.phone_text}</p>
                    <CheckoutAddress
                        title="Edit Address"
                        firstName={address.profile?.first_name}
                        lastName={address.profile?.last_name}
                        phone={address.profile?.phone_text}
                        address={address.address}
                        postalCode={address.postal_code}
                        locality={address.locality}
                        country={address.country}
                        action="edit"
                        addressId={address.id}
                        makeDefault={address.make_default}
                        onSuccess={onSuccess}
                    >
                        <button type="button" className="mt-3 text-[#900036] font-bold">
                            Edit
                        </button>
                    </CheckoutAddress>
                </div>
            </div>

            {/* Radio Input */}
            <input
                type="radio"
                name="selectedAddress"     
                value={address.id}
                checked={selectedAddressId === address.id}
                onChange={() => setSelectedAddressId(address.id)}
                className="w-5 h-5 accent-pink-600 cursor-pointer"
            />
        </>
    );
};

export default AddressDetails;