/**
 * Zod schema + encoding for the product CSV interchange format.
 *
 * One CSV row = one product VARIANT (the Shopify-style flat layout). Rows that
 * share a `slug` are grouped into a single product on import; the product-level
 * columns (name, category, status, …) are read from the first row of each group.
 *
 * Nested data is packed into single cells with `|` (list) and `:` (pair):
 *   variant_attributes     Size:M|Color:Red
 *   variant_pricing_tiers  wholesale:10:5     (label:min_qty:discount_percent)
 *   variant_images         variants/a.png|variants/b.png
 *   product_details        Material:Cotton|Care:Hand wash
 */
import { z } from 'zod'
import { PRODUCT_TYPES } from '@/shared/types/product'
import { productStatusSchema } from '@/features/products/validations/product'
import { splitList, splitPair, joinList } from '@/shared/lib/csv'

// Empty cell → undefined, so `.optional()` and defaults behave predictably.
const blankToUndef = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v

const numberCell = z.preprocess(
  blankToUndef,
  z.coerce.number({ message: 'must be a number' }),
)

const boolCell = z.preprocess((v) => {
  if (typeof v !== 'string') return v
  const s = v.trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'active'].includes(s)) return true
  if (['false', '0', 'no', 'n', 'inactive', ''].includes(s)) return false
  return v
}, z.boolean())

// The canonical column order — used for both the export header and the template.
export const PRODUCT_CSV_COLUMNS = [
  'slug',
  'name',
  'description',
  'category',
  'type',
  'status',
  'discount',
  'variant_sku',
  'variant_price',
  'variant_stock',
  'variant_is_active',
  'variant_attributes',
  'variant_pricing_tiers',
  'variant_images',
  'product_details',
] as const

// A single parsed/validated CSV row (one variant).
export const productCsvRowSchema = z.object({
  slug: z
    .string()
    .min(1, 'slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'slug must be lowercase letters, numbers, and hyphens only',
    ),
  name: z.string().min(1, 'name is required').max(255, 'name is too long'),
  description: z.preprocess(blankToUndef, z.string().optional()),
  // Category by name OR slug; resolved to an id on import. Blank = uncategorized.
  category: z.preprocess(blankToUndef, z.string().optional()),
  type: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? 'Physical' : v),
    z.enum(PRODUCT_TYPES, { error: `type must be one of: ${PRODUCT_TYPES.join(', ')}` }),
  ),
  status: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? 'ACTIVE' : String(v).toUpperCase()),
    productStatusSchema,
  ),
  discount: z.preprocess(
    blankToUndef,
    z.coerce.number().min(0, 'discount cannot be negative').max(100, 'discount cannot exceed 100').optional(),
  ),

  variant_sku: z.preprocess(blankToUndef, z.string().optional()),
  variant_price: numberCell.refine((n) => n >= 0, 'variant_price cannot be negative'),
  variant_stock: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? 0 : v),
    z.coerce.number().int('variant_stock must be a whole number').min(0, 'variant_stock cannot be negative'),
  ),
  variant_is_active: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? true : v),
    boolCell,
  ),

  variant_attributes: z.preprocess(blankToUndef, z.string().optional()),
  variant_pricing_tiers: z.preprocess(blankToUndef, z.string().optional()),
  variant_images: z.preprocess(blankToUndef, z.string().optional()),
  product_details: z.preprocess(blankToUndef, z.string().optional()),
})

export type ProductCsvRow = z.infer<typeof productCsvRowSchema>

// ── Cell decoders (pipe/colon encoding → structured) ──────────────────────────

export type ParsedAttribute = { attribute_name: string; attribute_value: string }
export type ParsedTier = { label: string; min_quantity: number; discount_percent: number }
export type ParsedDetail = { attribute_name: string; attribute_value: string; sort_order: number }

export const parseAttributes = (cell?: string): ParsedAttribute[] =>
  splitList(cell)
    .map((item) => {
      const [name, ...rest] = splitPair(item)
      return { attribute_name: name, attribute_value: rest.join(':') }
    })
    .filter((a) => a.attribute_name && a.attribute_value)

export const parseTiers = (cell?: string): ParsedTier[] =>
  splitList(cell)
    .map((item) => {
      const [label, min, disc] = splitPair(item)
      return {
        label: label || 'wholesale',
        min_quantity: Number(min),
        discount_percent: Number(disc),
      }
    })
    .filter((t) => Number.isFinite(t.min_quantity) && Number.isFinite(t.discount_percent))

export const parseImages = (cell?: string): string[] => splitList(cell)

export const parseDetails = (cell?: string): ParsedDetail[] =>
  splitList(cell).map((item, i) => {
    const [name, ...rest] = splitPair(item)
    return { attribute_name: name, attribute_value: rest.join(':'), sort_order: i }
  }).filter((d) => d.attribute_name && d.attribute_value)

// ── Cell encoders (structured → pipe/colon encoding) for export ───────────────

export const encodeAttributes = (attrs: { name: string; value: string }[]): string =>
  joinList(attrs.map((a) => `${a.name}:${a.value}`))

export const encodeTiers = (
  tiers: { label: string; min_quantity: number; discount_percent: number }[],
): string =>
  // The retail tier (min_qty 1, 0%) is auto-seeded by the RPC — don't export it.
  joinList(
    tiers
      .filter((t) => !(t.min_quantity === 1 && t.discount_percent === 0))
      .map((t) => `${t.label}:${t.min_quantity}:${t.discount_percent}`),
  )

export const encodeImages = (paths: string[]): string => joinList(paths)

export const encodeDetails = (details: { attribute_name: string; attribute_value: string }[]): string =>
  joinList(details.map((d) => `${d.attribute_name}:${d.attribute_value}`))
