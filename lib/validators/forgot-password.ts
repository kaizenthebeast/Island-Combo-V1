/** Zod schema for the forgot-password form. */
import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email address"),
});

export type ForgotPasswordFormInput = z.infer<typeof forgotPasswordSchema>;
