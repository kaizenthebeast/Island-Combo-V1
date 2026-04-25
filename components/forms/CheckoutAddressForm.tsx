"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { AddressFormValues } from "@/types/users";
import { insertAddressInfo } from "@/lib/users"


import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";


type Props = {
    children: React.ReactNode;
    title?: string
};



const CheckoutAddress = ({ children, title = "Address" }: Props) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        reset,
        watch,
    } = useForm<AddressFormValues>({
        defaultValues: {
            firstName: "",
            lastName: "",
            phone: "",
            address: "",
            postalCode: "",
            locality: "",
            country: "",
            makeDefault: false,
        },
    });

    const makeDefault = watch("makeDefault");

    const onSubmit: SubmitHandler<AddressFormValues> = (data) => {
        try {
            insertAddressInfo({
                firstName: data.firstName,
                lastName: data.lastName,
                address: data.address,
                phone: data.phone,
                postalCode: data.postalCode,
                locality: data.locality,
                country: data.country,
                makeDefault: data.makeDefault,
            })
            reset();
        } catch (error) {
            console.error("Error inserting user info:", error);
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>{children}</SheetTrigger>

            <SheetContent
                side="right"
                className="w-full sm:w-[420px] h-screen overflow-y-auto bg-white p-5"
            >
                <div className="flex items-center gap-3 mb-6">
                    <SheetClose asChild>
                        <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                    </SheetClose>
                    <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First name</Label>
                            <Input
                                id="firstName"
                                placeholder="Jane"
                                maxLength={15}
                                required
                                {...register("firstName", { required: "First name is required" })}
                                aria-invalid={errors.firstName ? "true" : "false"}
                            />
                            {errors.firstName && (
                                <p className="text-sm text-red-500">{errors.firstName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last name</Label>
                            <Input
                                id="lastName"
                                placeholder="Smith"
                                maxLength={15}
                                required
                                {...register("lastName", { required: "Last name is required" })}
                                aria-invalid={errors.lastName ? "true" : "false"}
                            />
                            {errors.lastName && (
                                <p className="text-sm text-red-500">{errors.lastName.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Mobile number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="091234545454"
                            maxLength={16}
                            required
                            {...register("phone", { required: "Mobile number is required" })}
                            aria-invalid={errors.phone ? "true" : "false"}
                        />
                        {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            placeholder="Apartment, suite, etc."
                            required
                            {...register("address")}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="postalCode">Postal Code</Label>
                            <Input
                                id="postalCode"
                                placeholder="96941"
                                required
                                {...register("postalCode", { required: "Postal code is required" })}
                                aria-invalid={errors.postalCode ? "true" : "false"}
                            />
                            {errors.postalCode && (
                                <p className="text-sm text-red-500">{errors.postalCode.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="locality">Locality</Label>
                            <Input
                                id="locality"
                                placeholder="Kolonia"
                                required
                                {...register("locality", { required: "Locality is required" })}
                                aria-invalid={errors.locality ? "true" : "false"}
                            />
                            {errors.locality && (
                                <p className="text-sm text-red-500">{errors.locality.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                            id="country"
                            placeholder="Micronesia, Federated States of"
                            {...register("country", { required: "Country is required" })}
                            aria-invalid={errors.country ? "true" : "false"}
                            required
                        />
                        {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}
                    </div>

                    <div className="flex items-center justify-between rounded-3xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <div>
                            <p className="text-sm font-medium">Make default</p>
                            <p className="text-xs text-gray-500">Use this address for future orders.</p>
                        </div>
                        <Switch
                            checked={makeDefault}
                            onCheckedChange={(checked) => setValue("makeDefault", Boolean(checked))}
                        />
                    </div>

                    <Button type="submit" className="w-full bg-[#900036] hover:bg-[#77002d] rounded-full">
                        Save
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
};

export default CheckoutAddress;