import { NextRequest } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'
import { importCategories } from '@/features/categories/api/admin/io'

const MAX_CSV_BYTES = 8 * 1024 * 1024

// POST /api/admin/categories/import — bulk create/update categories from CSV.
// Body: raw CSV text (Content-Type: text/csv).
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const lengthHeader = Number(req.headers.get('content-length') ?? 0)
    if (lengthHeader > MAX_CSV_BYTES) {
      return apiError('CSV file is too large (max 8 MB).', HTTP.BAD_REQUEST)
    }

    const csvText = await req.text()
    if (!csvText.trim()) return apiError('CSV file is empty.', HTTP.BAD_REQUEST)
    if (csvText.length > MAX_CSV_BYTES) {
      return apiError('CSV file is too large (max 8 MB).', HTTP.BAD_REQUEST)
    }

    const result = await importCategories(csvText)

    const message =
      result.failed > 0
        ? `Imported ${result.created} new, updated ${result.updated}, ${result.failed} failed.`
        : `Imported ${result.created} new and updated ${result.updated} categor(ies).`

    return apiOk({ data: result, message })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
