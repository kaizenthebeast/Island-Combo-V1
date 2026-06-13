import { NextRequest } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'
import { importProducts } from '@/features/products/api/admin/io'

// Reject oversized uploads before reading them into memory. 8 MB of CSV is tens
// of thousands of variant rows — comfortably above any real catalog migration.
const MAX_CSV_BYTES = 8 * 1024 * 1024

// POST /api/admin/products/import — bulk create/update products from CSV.
// Body: raw CSV text (Content-Type: text/csv). Returns a per-run summary with
// created/updated/failed counts and row-level errors.
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

    const result = await importProducts(csvText)

    const message =
      result.failed > 0
        ? `Imported ${result.created} new, updated ${result.updated}, ${result.failed} failed.`
        : `Imported ${result.created} new and updated ${result.updated} product(s).`

    return apiOk({ data: result, message })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
