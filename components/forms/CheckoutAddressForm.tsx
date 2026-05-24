"use client";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    checkoutAddressSchema,
    CheckoutAddressFormValues,
} from "@/form-schema/addressSchema";
import { insertAddressInfo, updateAddressInfo } from "@/lib/users";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { customToast } from "@/components/popup/ToastCustom";

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

    const form = useForm<CheckoutAddressFormValues>({
        resolver: zodResolver(checkoutAddressSchema),
        defaultValues: {
            firstName: firstName || "",
            lastName: lastName || "",
            phone: phone || "",
            address: address || "",
            postalCode: postalCode || "",
            locality: locality || "",
            country: country || "",
            makeDefault: makeDefault,
        },
    });

    const onSubmit: SubmitHandler<CheckoutAddressFormValues> = async (data) => {
        try {
            if (action === "add") {
                await insertAddressInfo(data);
                form.reset();
            } else if (action === "edit") {
                await updateAddressInfo(addressId, data);
            }
            setOpen(false);
            if (onSuccess) onSuccess();
            if (action === "add") {
                customToast.success({
                    title: "Successfully added address",
                    description: "Your new address has been added to your account.",
                });
            } else {
                customToast.success({
                    title: "Successfully updated address",
                    description: "Your address has been updated.",
                });
            }
        } catch (error) {
            console.error("Error saving address:", error);
            customToast.error({
                title: "An Error Occured",
                description: "There's an error occured during the process.",
            });
        }
    };

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

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Jane"
                                                maxLength={15}
                                                autoComplete="given-name"
                                                readOnly={!!firstName}
                                                className={!!firstName ? "bg-gray-100 cursor-not-allowed" : ""}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Smith"
                                                maxLength={15}
                                                autoComplete="family-name"
                                                readOnly={!!lastName}
                                                className={!!lastName ? "bg-gray-100 cursor-not-allowed" : ""}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mobile number</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="tel"
                                            placeholder="091234545454"
                                            maxLength={16}
                                            autoComplete="tel"
                                            readOnly={!!phone}
                                            className={!!phone ? "bg-gray-100 cursor-not-allowed" : ""}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Apartment, suite, etc."
                                            autoComplete="street-address"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="postalCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Postal Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="96941"
                                                autoComplete="postal-code"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="locality"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Locality</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Kolonia"
                                                autoComplete="address-level2"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Micronesia, Federated States of"
                                            autoComplete="country-name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="makeDefault"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-3xl border border-gray-200 bg-gray-50 px-4 py-4 gap-2">
                                    <div>
                                        <FormLabel className="text-sm font-medium">Make default</FormLabel>
                                        <p className="text-xs text-gray-500">
                                            Use this address for future orders.
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full bg-brand hover:bg-brand-hover rounded-full"
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? "Saving…" : "Save"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
};

export default CheckoutAddress;
