import {z} from 'zod';

export const addressSchema = z.object({

})

export type AddressFormInput = z.infer<typeof addressSchema>