import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/wishlist/wishlist'
import type { AddWishlistPayload } from '@/types/wishlist'
import { HTTP, apiOk, apiError, apiResult, toApiError } from '@/lib/api/respond'

// GET /api/wishlist — Fetch the current user's wishlist.
// Auth required — wishlists are user-scoped.
// Returns WishlistView[] with full product + variant detail.
export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const data = await getWishlist(user.id)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// POST /api/wishlist — Add a product to the wishlist. Body: { product_id: number }
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body: AddWishlistPayload = await req.json()
    if (!body.product_id) return apiError('product_id is required', HTTP.BAD_REQUEST)

    const result = await addToWishlist(user.id, body.product_id)
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/wishlist — Remove a product from the wishlist. Body: { product_id: number }
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body: { product_id: number } = await req.json()
    if (!body.product_id) return apiError('product_id is required', HTTP.BAD_REQUEST)

    const result = await removeFromWishlist(user.id, body.product_id)
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}
