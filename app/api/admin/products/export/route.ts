import { NextResponse } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { apiError, toApiError } from '@/shared/lib/http/respond'
import { exportProducts } from '@/features/products/api/admin/io'

// GET /api/admin/products/export — download the full catalog as CSV (admin only).
// One row per variant; the file round-trips back through the import endpoint.
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const csv = await exportProducts()
    const filename = `products-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
