import { NextRequest, NextResponse } from 'next/server'
import { getProductSuggestions } from '@/lib/search'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 8

  try {
    const data = await getProductSuggestions(q, Number.isFinite(limit) ? limit : 8)

    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ success: false, message, data: [] }, { status: 500 })
  }
}
