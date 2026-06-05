/** Zod schema for product forms. */
import { z } from "zod";
import { PRODUCT_TYPES } from "@/lib/types/product";

// Shared: Product Status
// Mirrors the `product_status` enum in the DB (is_active removed from products table)
export const productStatusSchema = z.enum(["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"]);

// Shared: Variant Attribute
export const variantAttributeSchema = z.object({
  // Present when editing an existing attribute; absent when adding a new one
  id: z.number().int().positive().optional(),
  attribute_name: z.string().min(1, "Attribute name is required"),
  attribute_value: z.string().min(1, "Attribute value is required"),
});

// Shared: Variant Image
// file    — File object for a newly uploaded image; null/undefined for existing ones
// preview — blob URL (new) or Storage URL (existing)
// path    — Storage path; only present for existing images (used for deletion)
// url     — alias for Storage path, kept for back-compat with add-product flow
export const variantImageSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= 5 * 1024 * 1024, "Image must be under 5 MB")
    .refine(
      (f) =>
        ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
      "Only JPEG, PNG, WebP, or GIF allowed"
    )
    .nullable()
    .optional(),
  preview: z.string(),
  url: z.string().optional(),   // Storage path alias (add-product flow)
  path: z.string().optional(),  // Storage path (edit-product flow)
  is_primary: z.boolean(),
  sort_order: z.number().int().min(0),
});

// Shared: Pricing Tier
export const pricingTierSchema = z.object({
  // Present when editing an existing tier; absent when adding a new one
  id: z.number().int().positive().optional(),

  label: z.string().min(1, "Tier label is required"),

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

// Shared: Product Variant
export const productVariantSchema = z.object({
  // Present when editing an existing variant; absent when adding a new one
  variant_id: z.number().int().positive().optional(),

  sku: z.string().optional(),

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
    .default(0)
    .refine(
      (v) => !/^0\d/.test(String(v)),
      "Stock cannot have a leading zero (e.g. 012)"
    ),

  is_active: z.boolean().default(true),

  // Pricing tiers — retail tier (min_qty: 1, discount: 0%) is auto-seeded by the RPC.
  // Validated: no duplicate labels, no duplicate min_quantities.
  pricing_tiers: z
    .array(pricingTierSchema)
    .default([])
    .refine(
      (tiers) => {
        const labels = tiers.map((t) => t.label);
        return labels.length === new Set(labels).size;
      },
      { message: "Each tier must have a unique label" }
    )
    .refine(
      (tiers) => {
        const qtys = tiers.map((t) => t.min_quantity);
        return qtys.length === new Set(qtys).size;
      },
      { message: "Each tier must have a unique minimum quantity" }
    ),

  // IDs of pricing tiers to delete on save (edit flow only; ignored on add)
  deleted_tier_ids: z.array(z.number()).default([]),

  attributes: z.array(variantAttributeSchema).default([]),

  // IDs of attributes to delete on save (edit flow only; ignored on add)
  deleted_attribute_ids: z.array(z.number()).default([]),

  images: z.array(variantImageSchema).default([]),

  // Storage paths of images to delete on save (edit flow only; ignored on add)
  deleted_image_paths: z.array(z.string()).default([]),
});

// Shared: Product Detail
export const productDetailSchema = z.object({
  // Present when editing an existing detail; absent when adding a new one
  id: z.number().int().positive().optional(),
  attribute_name: z.string().min(1, "Detail name is required"),
  attribute_value: z.string().min(1, "Detail value is required"),
  sort_order: z.number().int().min(0).default(0),
});

// Root: Product Schema (Add + Edit unified)
// Use `product_id` to distinguish add (absent) from edit (present) at runtime.
export const productSchema = z.object({
  // Only present in the edit flow; absent when creating a new product
  product_id: z.number().int().positive().optional(),

  name: z
    .string()
    .min(1, "Product name is required")
    .max(255, "Name is too long"),

  description: z.string().nullable().optional(),

  category_id: z.coerce
    .number()
    .int()
    .positive("Please select a category")
    .nullable()
    .optional(),

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

  // Replaces the old `is_active` boolean on the product level.
  // Mirrors the `product_status` DB enum: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  status: productStatusSchema.default("ACTIVE"),

  // Constrained to the canonical product types so a Digital product is always
  // stored exactly as 'Digital' (the value the §3.9 payment rule keys on). The
  // empty default in the form fails this until the admin picks one.
  type: z.enum(PRODUCT_TYPES, { error: "Please choose a product type" }),

  // Unified field name — was `details` in add, `product_details` in edit
  product_details: z.array(productDetailSchema).default([]),

  // IDs of product details to delete on save (edit flow only; ignored on add)
  deleted_detail_ids: z.array(z.number()).default([]),

  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required"),

  // IDs of variants to delete on save (edit flow only; ignored on add)
  deleted_variant_ids: z.array(z.number()).default([]),
});

// Convenience type aliases
export type ProductFormValues      = z.infer<typeof productSchema>;
export type ProductVariantValues   = z.infer<typeof productVariantSchema>;
export type VariantImageValues     = z.infer<typeof variantImageSchema>;
export type VariantAttributeValues = z.infer<typeof variantAttributeSchema>;
export type ProductDetailValues    = z.infer<typeof productDetailSchema>;
export type PricingTierValues      = z.infer<typeof pricingTierSchema>;
export type ProductStatus          = z.infer<typeof productStatusSchema>;
