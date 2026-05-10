import { z } from 'zod'

export const addCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  subCategories: z.array(
    z.object({
      name: z.string().min(1, 'Sub-category name is required'),
    })
  ).optional(),
})

export type AddCategoryFormValues = z.infer<typeof addCategorySchema>

export const editCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  parent_id: z.number().nullable().optional(),
  subCategories: z.array(
    z.object({ name: z.string().min(1, 'Sub-category name is required') })
  ).optional(),
})

export type EditCategoryFormValues = z.infer<typeof editCategorySchema>