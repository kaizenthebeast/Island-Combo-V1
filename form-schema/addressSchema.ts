import { z } from "zod";

export const addressSchema = z.object({
    firstName: z.string().min(1, "First name is required").trim(),
    lastName: z.string().min(1, "Last name is required").trim(),
    phoneNumber: z.string().min(10, "Phone number is too short").max(15, "Phone number is too long").regex(/^[0-9+ ]+$/, "Invalid phone number format"),
    address: z.string().min(1, "Address is required").trim(),
    postalCode: z.string().min(4, "Postal code is too short").max(10, "Postal code is too long").regex(/^[0-9A-Za-z-]+$/, "Invalid postal code format"),
    locality: z.string().min(1, "Locality is required").trim(),
    country: z.string().min(1, "Country is required").trim(),
});

export type AddressFormInput = z.infer<typeof addressSchema>;