import { NextRequest } from 'next/server'
import { getProductSuggestions } from '@/lib/search'
import { apiOk, apiError, HTTP } from '@/lib/api/respond'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 8

  try {
    const data = await getProductSuggestions(q, Number.isFinite(limit) ? limit : 8)

    return apiOk(
      { data },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return apiError(message, HTTP.INTERNAL)
  }
}
