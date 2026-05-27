"use client";
import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import AddressFormBody from "./AddressFormBody";

type Props = {
    children: React.ReactNode;
    title?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    locality?: string;
    country?: string;
    action: "add" | "edit";
    addressId?: number;
    makeDefault?: boolean;
    onSuccess?: () => void;
};

const CheckoutAddress = ({
    children,
    title = "Address",
    firstName,
    lastName,
    phone,
    address,
    postalCode,
    locality,
    country,
    action,
    addressId,
    makeDefault = false,
    onSuccess,
}: Props) => {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>

            <SheetContent
                side="right"
                className="w-full sm:w-[420px] h-screen overflow-y-auto bg-white p-5"
            >
                <div className="flex items-center gap-3 mb-6">
                    <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
                </div>

                <AddressFormBody
                    action={action}
                    addressId={addressId}
                    lockIdentity={!!firstName}
                    saveLabel={action === "add" ? "Add address" : "Update address"}
                    defaults={{
                        firstName,
                        lastName,
                        phone,
                        address,
                        postalCode,
                        locality,
                        country,
                        makeDefault,
                    }}
                    onSuccess={() => {
                        setOpen(false);
                        onSuccess?.();
                    }}
                />
            </SheetContent>
        </Sheet>
    );
};

export default CheckoutAddress;
