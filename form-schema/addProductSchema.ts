import { z } from "zod";

// ─── Variant Attribute ────────────────────────────────────────────────────────
const variantAttributeSchema = z.object({
  attribute_name: z.string().min(1, "Attribute name is required"),
  attribute_value: z.string().min(1, "Attribute value is required"),
});

// ─── Product Image ────────────────────────────────────────────────────────────
// file is optional to support two cases:
//   NEW image     — file is a File object, url is a blob preview
//   EXISTING image — file is null (already in Storage), url is the Storage path
// Validation only runs on file when it is actually present.
const variantImageSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= 5 * 1024 * 1024, "Image must be under 5 MB")
    .refine(
      (f) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
      "Only JPEG, PNG, WebP, or GIF allowed"
    )
    .nullable()
    .optional(),
  // url is present for existing images (Storage path) and absent for new ones
  // (preview blob URL is stored in preview instead)
  url: z.string().optional(),
  is_primary: z.boolean(),
  sort_order: z.number().int().min(0),
  preview: z.string(),
});

// ─── Pricing Tier ─────────────────────────────────────────────────────────────
// label:            tier name  'wholesale'
// min_quantity:     minimum cart quantity to activate this tier
// discount_percent: 
export const pricingTierSchema = z.object({
  label: z
    .string()
    .min(1, "Tier label is required"),

  min_quantity: z
    .number()
    .int("Minimum quantity must be a whole number")
    .min(1, "Minimum quantity must be at least 1")
    .refine(
      (v) => !/^0\d/.test(String(v)),
      "Minimum quantity cannot have a leading zero (e.g. 012)"
    ),

  discount_percent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .refine(
      (v) => !/^0\d/.test(String(v)),
      "Discount cannot have a leading zero (e.g. 025)"
    ),
});

// ─── Product Variant ──────────────────────────────────────────────────────────
const productVariantSchema = z.object({
  // variant_id is optional present when editing an existing variant so the
  // RPC knows to UPDATE it, absent when adding a new variant so it INSERTs.
  variant_id: z.number().int().positive().optional(),

  price: z
    .number()
    .nonnegative("Price must be at least 0")
    .refine(
      (v) => !/^0\d/.test(String(v)),
      "Price cannot have a leading zero (e.g. 012)"
    ),

  stock: z
    .number()
    .int("Stock must be a whole number")
    .nonnegative("Stock must be at least 0")
    .refine(
      (v) => !/^0\d/.test(String(v)),
      "Stock cannot have a leading zero (e.g. 012)"
    ),

  is_active: z.boolean(),
  attributes: z.array(variantAttributeSchema),
  images: z.array(variantImageSchema),

  // Pricing tiers admin defines wholesale tiers here.
  // Retail tier (min_qty: 1, discount: 0%) is always auto-seeded by the RPC.
  // Validated: no duplicate labels, no duplicate min_quantities.
  pricing_tiers: z
    .array(pricingTierSchema)
    .refine(
      (tiers) => {
        const labels = tiers.map((t) => t.label)
        return labels.length === new Set(labels).size
      },
      { message: "Each tier must have a unique label" }
    )
    .refine(
      (tiers) => {
        const qtys = tiers.map((t) => t.min_quantity)
        return qtys.length === new Set(qtys).size
      },
      { message: "Each tier must have a unique minimum quantity" }
    ),
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
 category_id: z.coerce
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
    .refine(
      (v) => !/^0\d/.test(String(v)),
      "Discount cannot have a leading zero (e.g. 025)"
    )
    .nullable()
    .optional(),
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
export type PricingTierValues = z.infer<typeof pricingTierSchema>;