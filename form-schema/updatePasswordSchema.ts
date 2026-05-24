import { z } from "zod";

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(16, "Password must not exceed 16 characters"),
});

export type UpdatePasswordFormInput = z.infer<typeof updatePasswordSchema>;
