/**
 * Zod schema + column order for the category CSV interchange format.
 *
 * One CSV row = one category (parent or child). The two-level hierarchy is
 * expressed with the `parent` column: blank = a top-level category, otherwise
 * the name or slug of the parent. `slug` is optional on import — when omitted the
 * DB trigger derives it from the name; when present it's used as the match key so
 * re-imports update in place.
 */
import { z } from 'zod'

const blankToUndef = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v

export const CATEGORY_CSV_COLUMNS = ['name', 'slug', 'parent', 'is_active'] as const

export const categoryCsvRowSchema = z.object({
  name: z.string().min(1, 'name is required').max(255, 'name is too long'),
  slug: z.preprocess(
    blankToUndef,
    z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'slug must be lowercase letters, numbers, and hyphens only',
      )
      .optional(),
  ),
  // Parent by name OR slug; blank = top-level category.
  parent: z.preprocess(blankToUndef, z.string().optional()),
  is_active: z.preprocess((v) => {
    if (typeof v !== 'string') return v
    const s = v.trim().toLowerCase()
    if (s === '' ) return true // default active
    if (['true', '1', 'yes', 'y', 'active'].includes(s)) return true
    if (['false', '0', 'no', 'n', 'inactive', 'archived'].includes(s)) return false
    return v
  }, z.boolean()),
})

export type CategoryCsvRow = z.infer<typeof categoryCsvRowSchema>
