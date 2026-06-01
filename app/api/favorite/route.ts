import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getFavorite, addFavorite, removeFavorite } from '@/lib/favorite'
import type { AddFavoritePayload } from '@/types/favorite'
import { HTTP, apiOk, apiError, apiResult, toApiError } from '@/lib/api/respond'

// GET /api/favorite — Fetch the current user's favorites
// Auth required — favorites are user-scoped.
// Returns FavoriteView[] with full product + variant detail.

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const data = await getFavorite(user.id)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// POST /api/favorite — Add a product to favorites
// Body: { product_id: number }

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body: AddFavoritePayload = await req.json()
    if (!body.product_id) return apiError('product_id is required', HTTP.BAD_REQUEST)

    const result = await addFavorite(user.id, body.product_id)
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/favorite — Remove a product from favorites
// Body: { product_id: number }

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body: { product_id: number } = await req.json()
    if (!body.product_id) return apiError('product_id is required', HTTP.BAD_REQUEST)

    const result = await removeFavorite(user.id, body.product_id)
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}
