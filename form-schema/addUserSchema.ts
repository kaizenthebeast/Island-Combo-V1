
import { z } from 'zod'

export const addUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone_text: z.string().optional(),
  age: z.number().int().min(0).optional(),
  sex: z.enum(['Male', 'Female']).optional(),
  role: z.enum(['customer', 'staff', 'admin']),  
})

export type AddUserFormValues = z.infer<typeof addUserSchema>