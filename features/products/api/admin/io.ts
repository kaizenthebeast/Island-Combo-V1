'use server'
/**
 * Product CSV import / export (admin only).
 *
 *  • exportProducts() — every product flattened to one row per variant, ready to
 *    round-trip back through import.
 *  • importProducts() — parse → validate (Zod) → group by slug → upsert through
 *    the existing SECURITY DEFINER RPCs (add_admin_product / update_admin_product).
 *
 * Reusing the RPCs (rather than writing the tables directly) means imports go
 * through the same validation, SKU generation, stock-ledger writes, and audit
 * triggers as the admin UI — so a migrated catalog is indistinguishable from one
 * entered by hand. On top of the per-row audit the triggers already emit, we
 * record one `product.imported` / `product.exported` summary entry per run.
 */
import { createClient } from '@/shared/lib/db/server'
import { assertAdmin } from '@/features/auth/api'
import { revalidatePath } from 'next/cache'
import { insertAuditLog } from '@/features/audit/api/audit'
import { toCsv, fromCsv, type CsvColumn } from '@/shared/lib/csv'
import type { AdminProduct } from '@/shared/types/product'
import {
  PRODUCT_CSV_COLUMNS,
  productCsvRowSchema,
  parseAttributes,
  parseTiers,
  parseImages,
  parseDetails,
  encodeAttributes,
  encodeTiers,
  encodeImages,
  encodeDetails,
  type ProductCsvRow,
} from '@/features/products/validations/product-csv'

export type ImportError = { row: number; slug?: string; message: string }

export type ImportResult = {
  totalRows: number
  totalProducts: number
  created: number
  updated: number
  failed: number
  errors: ImportError[]
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

type ExportRow = {
  product: Pick<AdminProduct, 'slug' | 'name' | 'description' | 'type' | 'status' | 'discount'> & {
    category: AdminProduct['category']
    product_details: AdminProduct['product_details']
  }
  variant: AdminProduct['variants'][number]
  isFirstVariant: boolean
}

const PRODUCT_EXPORT_COLUMNS: CsvColumn<ExportRow>[] = [
  { key: 'slug',        value: (r) => r.product.slug },
  { key: 'name',        value: (r) => r.product.name },
  // Product-level fields only need to appear once per product; repeating them on
  // every variant row is also valid (import reads them from the first row).
  { key: 'description', value: (r) => r.product.description ?? '' },
  { key: 'category',    value: (r) => r.product.category?.name ?? '' },
  { key: 'type',        value: (r) => r.product.type },
  { key: 'status',      value: (r) => r.product.status },
  { key: 'discount',    value: (r) => r.product.discount ?? 0 },
  { key: 'variant_sku',           value: (r) => r.variant.sku ?? '' },
  { key: 'variant_price',         value: (r) => r.variant.price },
  { key: 'variant_stock',         value: (r) => r.variant.stock },
  { key: 'variant_is_active',     value: (r) => (r.variant.is_active ? 'true' : 'false') },
  { key: 'variant_attributes',    value: (r) => encodeAttributes(r.variant.attributes ?? []) },
  { key: 'variant_pricing_tiers', value: (r) => encodeTiers(r.variant.pricing_tiers ?? []) },
  { key: 'variant_images',        value: (r) => encodeImages(r.variant.images ?? []) },
  // Details belong to the product, not the variant → only emit on the first row.
  { key: 'product_details',       value: (r) => (r.isFirstVariant ? encodeDetails(r.product.product_details ?? []) : '') },
]

export async function exportProducts(): Promise<string> {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .order('product_id', { ascending: true })

  if (error) throw new Error(error.message)

  const products = (data ?? []) as AdminProduct[]
  const rows: ExportRow[] = []
  for (const p of products) {
    const variants = p.variants ?? []
    if (variants.length === 0) continue
    variants.forEach((variant, i) => {
      rows.push({
        product: {
          slug: p.slug,
          name: p.name,
          description: p.description,
          category: p.category,
          type: p.type,
          status: p.status,
          discount: p.discount,
          product_details: p.product_details ?? [],
        },
        variant,
        isFirstVariant: i === 0,
      })
    })
  }

  await insertAuditLog({
    action: 'product.exported',
    entityType: 'product',
    metadata: { source: 'csv', products: products.length, rows: rows.length },
  })

  return toCsv(rows, PRODUCT_EXPORT_COLUMNS)
}

// ── IMPORT ────────────────────────────────────────────────────────────────────

// A product grouped from one or more CSV rows that share a slug.
type ProductGroup = {
  slug: string
  firstLine: number          // spreadsheet line of the first row (for error reporting)
  header: ProductCsvRow      // product-level fields read from the first row
  variants: ProductCsvRow[]
}

export async function importProducts(csvText: string): Promise<ImportResult> {
  await assertAdmin()
  const supabase = await createClient()

  const { rows, headers, errors: parseErrors } = fromCsv(csvText)

  const errors: ImportError[] = parseErrors.map((e) => ({ row: e.row, message: e.message }))

  // Guard against the wrong file: bail out clearly instead of emitting a
  // "slug/name is required" error on every single row.
  const required = ['slug', 'name', 'variant_price'] satisfies Array<(typeof PRODUCT_CSV_COLUMNS)[number]>
  const missing = required.filter((c) => !headers.includes(c))
  if (rows.length > 0 && missing.length > 0) {
    return {
      totalRows: rows.length,
      totalProducts: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [{ row: 1, message: `Missing required column(s): ${missing.join(', ')}. Use the products template.` }],
    }
  }

  // 1. Validate every row; group the valid ones by slug (file order preserved).
  const groups = new Map<string, ProductGroup>()
  rows.forEach((raw, i) => {
    const line = i + 2 // header is line 1
    const parsed = productCsvRowSchema.safeParse(raw)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.')
        errors.push({ row: line, slug: raw.slug, message: field ? `${field}: ${issue.message}` : issue.message })
      }
      return
    }
    const row = parsed.data
    const existing = groups.get(row.slug)
    if (existing) {
      existing.variants.push(row)
    } else {
      groups.set(row.slug, { slug: row.slug, firstLine: line, header: row, variants: [row] })
    }
  })

  const totalRows = rows.length
  const totalProducts = groups.size
  let created = 0
  let updated = 0
  let failed = 0

  if (groups.size === 0) {
    return { totalRows, totalProducts, created, updated, failed, errors }
  }

  // 2. Resolve lookups in bulk: categories, existing products, existing variants.
  const categoryMap = await loadCategoryMap(supabase)

  const slugs = [...groups.keys()]
  const { data: existingProducts } = await supabase
    .from('products')
    .select('product_id, slug')
    .in('slug', slugs)

  const productIdBySlug = new Map<string, number>(
    (existingProducts ?? []).map((p) => [p.slug as string, p.product_id as number]),
  )

  // SKU → variant_id per product, so re-imports update variants in place.
  const variantIdByProductSku = new Map<number, Map<string, number>>()
  const existingIds = [...productIdBySlug.values()]
  if (existingIds.length > 0) {
    const { data: existingVariants } = await supabase
      .from('product_variants')
      .select('variant_id, sku, product_id')
      .in('product_id', existingIds)
    for (const v of existingVariants ?? []) {
      const pid = v.product_id as number
      if (!variantIdByProductSku.has(pid)) variantIdByProductSku.set(pid, new Map())
      if (v.sku) variantIdByProductSku.get(pid)!.set(v.sku as string, v.variant_id as number)
    }
  }

  // 3. Upsert each product group through the RPCs.
  for (const group of groups.values()) {
    try {
      const categoryId = resolveCategory(group.header.category, categoryMap)
      if (categoryId === 'missing') {
        failed++
        errors.push({
          row: group.firstLine,
          slug: group.slug,
          message: `category "${group.header.category}" not found — import categories first`,
        })
        continue
      }

      const existingId = productIdBySlug.get(group.slug)
      if (existingId) {
        const skuMap = variantIdByProductSku.get(existingId) ?? new Map<string, number>()
        await updateProductGroup(supabase, existingId, group, categoryId, skuMap)
        updated++
      } else {
        await addProductGroup(supabase, group, categoryId)
        created++
      }
    } catch (err) {
      failed++
      errors.push({
        row: group.firstLine,
        slug: group.slug,
        message: stripErrPrefix(err instanceof Error ? err.message : 'Import failed'),
      })
    }
  }

  revalidatePath('/admin/products')

  // 4. Summary audit entry (per-row product/variant changes are already captured
  //    by the DB triggers; this records the bulk operation itself).
  await insertAuditLog({
    action: 'product.imported',
    entityType: 'product',
    metadata: { source: 'csv', totalRows, totalProducts, created, updated, failed },
  })

  return { totalRows, totalProducts, created, updated, failed, errors }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type CategoryMap = { byName: Map<string, number>; bySlug: Map<string, number> }

async function loadCategoryMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CategoryMap> {
  const { data } = await supabase.from('category').select('category_id, name, slug')
  const byName = new Map<string, number>()
  const bySlug = new Map<string, number>()
  for (const c of data ?? []) {
    byName.set((c.name as string).toLowerCase(), c.category_id as number)
    bySlug.set((c.slug as string).toLowerCase(), c.category_id as number)
  }
  return { byName, bySlug }
}

// Returns the id, null for "uncategorized" (blank cell), or 'missing' when a name
// was given but matched nothing.
function resolveCategory(value: string | undefined, map: CategoryMap): number | null | 'missing' {
  if (!value || !value.trim()) return null
  const key = value.trim().toLowerCase()
  return map.byName.get(key) ?? map.bySlug.get(key) ?? 'missing'
}

function buildVariantPayload(variant: ProductCsvRow, variantId?: number) {
  return {
    ...(variantId ? { variant_id: variantId } : {}),
    price: variant.variant_price,
    stock: variant.variant_stock,
    is_active: variant.variant_is_active,
    pricing_tiers: parseTiers(variant.variant_pricing_tiers),
    attributes: parseAttributes(variant.variant_attributes),
    images: parseImages(variant.variant_images).map((url, i) => ({
      url,
      is_primary: i === 0,
      sort_order: i,
    })),
  }
}

async function addProductGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  group: ProductGroup,
  categoryId: number | null,
) {
  const payload = {
    name: group.header.name,
    description: group.header.description ?? null,
    category_id: categoryId,
    slug: group.slug,
    discount: group.header.discount ?? 0,
    status: group.header.status,
    type: group.header.type,
    variants: group.variants.map((v) => buildVariantPayload(v)),
    details: parseDetails(group.header.product_details),
  }
  const { error } = await supabase.rpc('add_admin_product', { payload })
  if (error) throw new Error(error.message)
}

async function updateProductGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: number,
  group: ProductGroup,
  categoryId: number | null,
  skuMap: Map<string, number>,
) {
  const payload = {
    product_id: productId,
    name: group.header.name,
    description: group.header.description ?? null,
    category_id: categoryId,
    slug: group.slug,
    discount: group.header.discount ?? 0,
    status: group.header.status,
    type: group.header.type,
    details: parseDetails(group.header.product_details),
    deleted_detail_ids: [],
    deleted_variant_ids: [],
    variants: group.variants.map((v) =>
      // Match an existing variant by SKU so re-imports update in place instead of
      // appending duplicates; unmatched rows insert as new variants.
      buildVariantPayload(v, v.variant_sku ? skuMap.get(v.variant_sku) : undefined),
    ),
  }
  const { error } = await supabase.rpc('update_admin_product', { payload })
  if (error) throw new Error(error.message)
}

// RPC errors are prefixed (DUPLICATE_ERROR:, VALIDATION_ERROR:, …) — surface the
// human part to the importer.
function stripErrPrefix(message: string): string {
  return message.replace(/^[A-Z_]+:\s*/, '')
}
