import { z } from "zod";

export const signupSchema = z.object({
    email: z.string().nonempty("Email is required").email("Invalid email address"),
    password: z.string().nonempty("Password is required").min(8, "Password must at least 8 characters").max(16, "Password must not exceed 16 characters"),
    confirmPassword: z.string().nonempty("Password is required").min(8, "Password must at least 8 characters").max(16, "Password must not exceed 16 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password do not match",
    path: ["confirmPassword"],
})


export type SignupFormInput = z.infer<typeof signupSchema>