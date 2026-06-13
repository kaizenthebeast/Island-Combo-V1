import { NextResponse } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { apiError, toApiError } from '@/shared/lib/http/respond'
import { exportCategories } from '@/features/categories/api/admin/io'

// GET /api/admin/categories/export — download all categories as CSV (admin only).
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const csv = await exportCategories()
    const filename = `categories-${new Date().toISOString().slice(0, 10)}.csv`

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
