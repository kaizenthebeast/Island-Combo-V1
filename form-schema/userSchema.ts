import { z } from 'zod'

export const editUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name:  z.string().min(1, 'Last name is required'),
  email:      z.string().email('Invalid email address').nonempty("Email is required"),
  phone_text: z.string().optional(),
  age:        z.number().int().min(0, 'Age must be 0 or above').optional().nullable(),
  sex:        z.enum(['Male', 'Female']).optional(),
  role:       z.enum(['customer', 'staff', 'admin']),
})

export const personalDetailsSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(15, 'Max 15 characters'),
  last_name:  z.string().min(1, 'Last name is required').max(15, 'Max 15 characters'),
  phone_text: z
    .string()
    .max(16, 'Max 16 characters')
    .optional()
    .or(z.literal('')),
})

export type EditUserFormValues         = z.infer<typeof editUserSchema>
export type PersonalDetailsFormValues  = z.infer<typeof personalDetailsSchema>