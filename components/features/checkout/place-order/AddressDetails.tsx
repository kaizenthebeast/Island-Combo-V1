'use client'
import React from "react";
import { Address } from "@/lib/types/users";
import { MapPin } from 'lucide-react';
import CheckoutAddress from "../CheckoutAddressForm";
import DeleteModal from "@/components/shared/modals/DeleteModal";
import { customToast } from '@/components/shared/modals/ToastCustom'

const AddressDetails = ({ address, selectedAddressId, setSelectedAddressId, onSuccess, }: {
    address: Address;
    selectedAddressId: number | null;
    setSelectedAddressId: (id: number | null) => void;
    onSuccess?: () => void;
}) => {

    async function handleDeleteAdd(id: number) {
        const res = await fetch("/api/address", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addressId: id }),
        });
        const result = await res.json();

        if (!result?.success) {
            customToast.error({
                title: "Couldn't delete address",
                description: result?.message ?? "Something went wrong while deleting the address.",
            });
            return;
        }

        if (onSuccess) onSuccess();
        customToast.success({
            title: "Address sucessfully deleted!",
            description: "The address has been removed from your account.",
        })
    }

    const isSelected = selectedAddressId === address.id;
    const fullName = [address.profile?.first_name, address.profile?.last_name]
        .filter(Boolean)
        .join(" ") || "Saved address";
    const fullAddress = [address.address, address.locality, `${address.country} ${address.postal_code}`.trim()]
        .filter(Boolean)
        .join(", ");

    return (
        <div
            onClick={() => setSelectedAddressId(address.id)}
            className="flex items-start justify-between gap-4 cursor-pointer"
        >
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand shrink-0" />
                    <span className="font-semibold text-foreground">{fullName}</span>
                    {address.make_default && (
                        <span className="text-[10px] font-semibold text-brand bg-brand-tint px-1.5 py-0.5 rounded">
                            Default
                        </span>
                    )}
                </div>

                <p className="text-sm text-muted-foreground">{fullAddress}</p>
                {address.profile?.phone_text && (
                    <p className="text-sm text-muted-foreground">{address.profile.phone_text}</p>
                )}

                {/* Stop card-select from firing when interacting with the actions */}
                <div className="flex items-center gap-4 mt-2" onClick={(e) => e.stopPropagation()}>
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
                        <button type="button" className="text-sm text-brand font-semibold cursor-pointer">
                            Edit
                        </button>
                    </CheckoutAddress>

                    <DeleteModal subtitle="address" onSuccess={() => handleDeleteAdd(address.id)}>
                        <button type="button" className="text-sm text-brand font-semibold cursor-pointer">
                            Remove
                        </button>
                    </DeleteModal>
                </div>
            </div>

            <input
                type="radio"
                name="selectedAddress"
                value={address.id}
                checked={isSelected}
                onChange={() => setSelectedAddressId(address.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 accent-brand cursor-pointer shrink-0 mt-1"
            />
        </div>
    );
};

export default AddressDetails;
