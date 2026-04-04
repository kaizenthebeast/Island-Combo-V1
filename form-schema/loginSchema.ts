import {z} from 'zod'

export const loginSchema = z.object({
    email: z.string().nonempty("Email is required").email("Invalid email address"),
    password: z.string().nonempty("Password is required").max(16, "Password must be only at most 16 characters")
});

export type LoginFormInput = z.infer<typeof loginSchema> 
