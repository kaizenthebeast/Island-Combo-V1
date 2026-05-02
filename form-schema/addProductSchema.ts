import { z } from "zod";

// ─── Variant Attribute ────────────────────────────────────────────────────────
const variantAttributeSchema = z.object({
  attribute_name: z.string().min(1, "Attribute name is required"),
  attribute_value: z.string().min(1, "Attribute value is required"),
});

// ─── Product Image (file upload) ──────────────────────────────────────────────
const variantImageSchema = z.object({
  file: z
    .instanceof(File, { message: "Must be a valid file" })
    .refine((f) => f.size <= 5 * 1024 * 1024, "Image must be under 5 MB")
    .refine(
      (f) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
      "Only JPEG, PNG, WebP, or GIF allowed"
    ),
  is_primary: z.boolean(),
  // FIX: starts at 0 for the first image — was .min(1) which caused silent
  // validation failure on upload and blocked step navigation.
  sort_order: z.number().int().min(0),
  preview: z.string(),
});

// ─── Product Variant ──────────────────────────────────────────────────────────
const productVariantSchema = z.object({
  price: z
    .number()
    .nonnegative("Price must be at least 0")
    .refine((v) => !/^0\d/.test(String(v)), "Price cannot have a leading zero"),
  stock: z
    .number()
    .int("Stock must be a whole number")
    .nonnegative("Stock must be at least 0")
    .refine((v) => !/^0\d/.test(String(v)), "Stock cannot have a leading zero"),
  is_active: z.boolean(),
  // FIX: removed .min(1) — attributes are optional. Not all products have
  // variant dimensions (e.g. a one-size digital product). When attributes ARE
  // present, each one still requires a non-empty name and value.
  attributes: z.array(variantAttributeSchema),
  images: z.array(variantImageSchema),
});

// ─── Product Detail ───────────────────────────────────────────────────────────
const productDetailSchema = z.object({
  attribute_name: z.string().min(1, "Detail name is required"),
  attribute_value: z.string().min(1, "Detail value is required"),
  sort_order: z.number().int().min(0),
});

// ─── Root: Add Product ────────────────────────────────────────────────────────
export const addProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255, "Name is too long"),
  description: z.string().optional(),
  category_id: z
    .number()
    .int()
    .positive("Please select a category"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  discount: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .nullable()
    .optional(),
  wholesale: z.boolean(),
  is_active: z.boolean(),
  type: z.string().min(1, "Product type is required"),
  variants: z.array(productVariantSchema).min(1, "At least one variant is required"),
  details: z.array(productDetailSchema),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type AddProductFormValues = z.infer<typeof addProductSchema>;
export type ProductVariantValues = z.infer<typeof productVariantSchema>;
export type VariantImageValues = z.infer<typeof variantImageSchema>;
export type VariantAttributeValues = z.infer<typeof variantAttributeSchema>;
export type ProductDetailValues = z.infer<typeof productDetailSchema>;