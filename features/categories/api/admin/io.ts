'use server'
/**
 * Category CSV import / export (admin only).
 *
 *  • exportCategories() — every category (parents + children) as flat rows.
 *  • importCategories() — parse → validate (Zod) → upsert directly on the
 *    `category` table. RLS (category_admin_insert/update) authorises the write and
 *    the `category_audit` trigger records each change; the `category_set_slug`
 *    trigger fills any missing slug. Top-level rows are processed before children
 *    so a child can reference a parent created in the same file.
 *
 * On top of the per-row audit the trigger emits, we record one
 * `category.imported` / `category.exported` summary entry per run.
 */
import { createClient } from '@/shared/lib/db/server'
import { assertAdmin } from '@/features/auth/api'
import { revalidatePath } from 'next/cache'
import { insertAuditLog } from '@/features/audit/api/audit'
import { toCsv, fromCsv, type CsvColumn } from '@/shared/lib/csv'
import {
  categoryCsvRowSchema,
  CATEGORY_CSV_COLUMNS,
  type CategoryCsvRow,
} from '@/features/categories/validations/category-csv'
import type { ImportResult, ImportError } from '@/features/products/api/admin/io'

type CategoryRecord = {
  category_id: number
  name: string
  slug: string
  parent_id: number | null
  is_active: boolean
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

type ExportRow = CategoryRecord & { parentSlug: string }

const CATEGORY_EXPORT_COLUMNS: CsvColumn<ExportRow>[] = [
  { key: 'name',      value: (r) => r.name },
  { key: 'slug',      value: (r) => r.slug },
  { key: 'parent',    value: (r) => r.parentSlug },
  { key: 'is_active', value: (r) => (r.is_active ? 'true' : 'false') },
]

export async function exportCategories(): Promise<string> {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('category')
    .select('category_id, name, slug, parent_id, is_active')
    .order('parent_id', { ascending: true, nullsFirst: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  const all = (data ?? []) as CategoryRecord[]
  const slugById = new Map(all.map((c) => [c.category_id, c.slug]))

  // Parents first so the file imports cleanly top-down.
  const rows: ExportRow[] = all
    .map((c) => ({ ...c, parentSlug: c.parent_id ? (slugById.get(c.parent_id) ?? '') : '' }))
    .sort((a, b) => Number(!!a.parent_id) - Number(!!b.parent_id))

  await insertAuditLog({
    action: 'category.exported',
    entityType: 'category',
    metadata: { source: 'csv', rows: rows.length },
  })

  return toCsv(rows, CATEGORY_EXPORT_COLUMNS)
}

// ── IMPORT ────────────────────────────────────────────────────────────────────

export async function importCategories(csvText: string): Promise<ImportResult> {
  await assertAdmin()
  const supabase = await createClient()

  const { rows, headers, errors: parseErrors } = fromCsv(csvText)
  const errors: ImportError[] = parseErrors.map((e) => ({ row: e.row, message: e.message }))

  // Guard against the wrong file before validating every row.
  const nameColumn: (typeof CATEGORY_CSV_COLUMNS)[number] = 'name'
  if (rows.length > 0 && !headers.includes(nameColumn)) {
    return {
      totalRows: rows.length,
      totalProducts: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [{ row: 1, message: `Missing required column: ${nameColumn}. Use the categories template.` }],
    }
  }

  // 1. Validate; keep the original line number for error reporting.
  const valid: { line: number; row: CategoryCsvRow }[] = []
  rows.forEach((raw, i) => {
    const line = i + 2
    const parsed = categoryCsvRowSchema.safeParse(raw)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.')
        errors.push({ row: line, message: field ? `${field}: ${issue.message}` : issue.message })
      }
      return
    }
    valid.push({ line, row: parsed.data })
  })

  // 2. Process top-level rows before children so parents resolve.
  valid.sort((a, b) => Number(!!a.row.parent) - Number(!!b.row.parent))

  const totalRows = rows.length
  let created = 0
  let updated = 0
  let failed = 0

  // Live lookup maps, seeded from the DB and updated as we insert.
  const { data: existing } = await supabase
    .from('category')
    .select('category_id, name, slug, parent_id')
  const idBySlug = new Map<string, number>()
  const idByName = new Map<string, number>()
  for (const c of existing ?? []) {
    idBySlug.set((c.slug as string).toLowerCase(), c.category_id as number)
    idByName.set((c.name as string).toLowerCase(), c.category_id as number)
  }

  for (const { line, row } of valid) {
    try {
      // Resolve parent (must already exist or have been created earlier in the run).
      let parentId: number | null = null
      if (row.parent) {
        const key = row.parent.toLowerCase()
        const resolved = idBySlug.get(key) ?? idByName.get(key)
        if (!resolved) {
          failed++
          errors.push({ row: line, message: `parent "${row.parent}" not found — list it before its children` })
          continue
        }
        parentId = resolved
      }

      // Match an existing row by slug, then by name, to update in place.
      const matchId =
        (row.slug ? idBySlug.get(row.slug.toLowerCase()) : undefined) ??
        idByName.get(row.name.toLowerCase())

      if (matchId) {
        const update: Record<string, unknown> = {
          name: row.name,
          parent_id: parentId,
          is_active: row.is_active,
        }
        if (row.slug) update.slug = row.slug
        const { error } = await supabase.from('category').update(update).eq('category_id', matchId)
        if (error) throw new Error(error.message)
        updated++
      } else {
        const insert: Record<string, unknown> = {
          name: row.name,
          parent_id: parentId,
          is_active: row.is_active,
        }
        if (row.slug) insert.slug = row.slug
        const { data: inserted, error } = await supabase
          .from('category')
          .insert(insert)
          .select('category_id, slug')
          .single()
        if (error) throw new Error(error.message)
        created++
        // Seed the maps so later rows can reference this brand-new parent.
        const newId = inserted!.category_id as number
        idBySlug.set((inserted!.slug as string).toLowerCase(), newId)
        idByName.set(row.name.toLowerCase(), newId)
      }
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : 'Import failed'
      errors.push({
        row: line,
        message: /duplicate key|unique/i.test(message)
          ? `a category with this slug already exists`
          : message,
      })
    }
  }

  revalidatePath('/admin/products/category')

  await insertAuditLog({
    action: 'category.imported',
    entityType: 'category',
    metadata: { source: 'csv', totalRows, created, updated, failed },
  })

  return { totalRows, totalProducts: created + updated, created, updated, failed, errors }
}
