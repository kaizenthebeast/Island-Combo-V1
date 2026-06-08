import { NextRequest } from 'next/server'
import { HTTP, apiOk, apiError, apiResult, toApiError } from '@/shared/lib/http/respond'
import { getProductReviews, addProductReview } from '@/lib/reviews/index'

// GET /api/review?slug=<product-slug>&page=&limit=
// Public: a product's paginated reviews (reviews_public_read).
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (!slug) return apiError('A product slug is required', HTTP.BAD_REQUEST)

    const page = Number(req.nextUrl.searchParams.get('page') ?? '1') || 1
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '10') || 10

    const data = await getProductReviews(slug, page, limit)
    return apiOk({ data })
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// POST /api/review  { product_id, order_id, rating, title?, body? }
// Leave a review. Eligibility (own + completed order, product in it, no duplicate)
// is enforced by RLS + the unique index; addProductReview surfaces the result.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return apiError('A JSON body is required', HTTP.BAD_REQUEST)

    const product_id = Number(body.product_id)
    const order_id = Number(body.order_id)
    const rating = Number(body.rating)

    if (!Number.isInteger(product_id) || !Number.isInteger(order_id))
      return apiError('product_id and order_id are required', HTTP.BAD_REQUEST)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return apiError('Rating must be a whole number from 1 to 5', HTTP.BAD_REQUEST)

    const result = await addProductReview({
      product_id,
      order_id,
      rating,
      title: typeof body.title === 'string' ? body.title.trim() || undefined : undefined,
      body: typeof body.body === 'string' ? body.body.trim() || undefined : undefined,
    })
    return apiResult(result)
  } catch (error: unknown) {
    return toApiError(error)
  }
}
