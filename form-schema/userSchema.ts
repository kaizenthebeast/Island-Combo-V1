import { z } from 'zod'

export const addUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name:  z.string().min(1, 'Last name is required'),
  email:      z.string().email('Invalid email address').nonempty("Email is required"),
  password:   z.string().min(8, 'Password must be at least 6 characters'),
  phone_text: z.string().optional(),
  age:        z.number().int().min(0).optional().nullable(),
  sex:        z.enum(['Male', 'Female']).optional(),
  role:       z.enum(['customer', 'staff', 'admin']),
})

export const editUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name:  z.string().min(1, 'Last name is required'),
  email:      z.string().email('Invalid email address').nonempty("Email is required"),
  phone_text: z.string().optional(),
  age:        z.number().int().min(0, 'Age must be 0 or above').optional().nullable(),
  sex:        z.enum(['Male', 'Female']).optional(),
  role:       z.enum(['customer', 'staff', 'admin']),
})

export type AddUserFormValues  = z.infer<typeof addUserSchema>
export type EditUserFormValues = z.infer<typeof editUserSchema>