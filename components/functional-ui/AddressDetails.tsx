'use client'
import React, { useState} from "react";
import { Address } from "@/types/users";


import { MapPin } from 'lucide-react';
import CheckoutAddress from "../forms/CheckoutAddressForm";

const AddressDetails = ({address} : {address: Address}) => {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);


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

                    <CheckoutAddress title="Edit Address" firstName={address.profile?.first_name}
                        lastName={address.profile?.last_name} phone={address.profile?.phone_text}
                        address={address.address} postalCode={address.postal_code} locality={address.locality}
                        country={address.country} action={"edit"} addressId={address.id}>
                        <button type="button" className="mt-3 text-[#900036] font-bold" data-id={address.id}>
                            Edit
                        </button>
                    </CheckoutAddress>
                </div>
            </div>

            {/* Radio Input */}
            <input
                type="radio"
                className="w-5 h-5 accent-pink-600 cursor-pointer"
                checked={selectedId === address.id}
                onChange={() => setSelectedId(address.id)}
            />
        </>
    )
}

export default AddressDetails