"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    checkoutAddressSchema,
    CheckoutAddressFormValues,
} from "@/lib/validators/address";

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
import { customToast } from "@/components/shared/modals/ToastCustom";

type Props = {
    action: "add" | "edit";
    addressId?: number;
    defaults?: Partial<CheckoutAddressFormValues>;
    /** Lock name + phone when they come from the account profile */
    lockIdentity?: boolean;
    saveLabel?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
};

const AddressFormBody = ({
    action,
    addressId,
    defaults,
    lockIdentity = false,
    saveLabel = "Save address",
    onSuccess,
    onCancel,
}: Props) => {
    const form = useForm<CheckoutAddressFormValues>({
        resolver: zodResolver(checkoutAddressSchema),
        defaultValues: {
            firstName: defaults?.firstName ?? "",
            lastName: defaults?.lastName ?? "",
            phone: defaults?.phone ?? "",
            address: defaults?.address ?? "",
            postalCode: defaults?.postalCode ?? "",
            locality: defaults?.locality ?? "",
            country: defaults?.country ?? "",
            makeDefault: defaults?.makeDefault ?? false,
        },
    });

    const onSubmit: SubmitHandler<CheckoutAddressFormValues> = async (data) => {
        try {
            // Goes through the authenticated /api/address route (the JWT boundary);
            // the route derives user_id server-side. The response is { success,
            // message } — we MUST check it, otherwise a rejected write (e.g. an RLS
            // denial) looks like a success and the address silently never saves.
            const res =
                action === "add"
                    ? await fetch("/api/address", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                      })
                    : await fetch("/api/address", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ addressId, ...data }),
                      });
            const result = await res.json();

            if (!result?.success) {
                customToast.error({
                    title: "Couldn't save address",
                    description: result?.message ?? "Something went wrong while saving your address.",
                });
                return;
            }

            if (action === "add") form.reset();
            onSuccess?.();
            customToast.success(
                action === "add"
                    ? {
                          title: "Successfully added address",
                          description: "Your new address has been added to your account.",
                      }
                    : {
                          title: "Successfully updated address",
                          description: "Your address has been updated.",
                      }
            );
        } catch (error) {
            console.error("Error saving address:", error);
            customToast.error({
                title: "An Error Occured",
                description: error instanceof Error ? error.message : "There's an error occured during the process.",
            });
        }
    };

    const lockedClass = lockIdentity ? "bg-muted cursor-not-allowed" : "";

    return (
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
                                        readOnly={lockIdentity}
                                        className={lockedClass}
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
                                        readOnly={lockIdentity}
                                        className={lockedClass}
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
                                    readOnly={lockIdentity}
                                    className={lockedClass}
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
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="House no., street, apartment, etc."
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
                        <FormItem className="flex items-center justify-between rounded-3xl border border-border bg-muted px-4 py-4 gap-2">
                            <div>
                                <FormLabel className="text-sm font-medium">Make default</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                    Use this address for future orders.
                                </p>
                            </div>
                            <FormControl className="cursor-pointer">
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex gap-3">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 rounded-full cursor-pointer"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        className="flex-1 bg-brand hover:bg-brand-hover rounded-full cursor-pointer"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? "Saving…" : saveLabel}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default AddressFormBody;
