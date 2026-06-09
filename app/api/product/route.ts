import { NextRequest } from 'next/server'
import { requireAdmin } from '@/features/auth/api'
import { getPublicProductsPage, type PublicProductSort } from '@/features/products/api/product'
import {
  addAdminProduct,
  updateAdminProduct,
  softDeleteProduct,
  restoreProduct,
  type AddProductPayload,
  type UpdateProductPayload,
} from '@/lib/admin/products/product'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'

// GET /api/product — Public list (no auth)
// Query params:
//   category_id      (number)    descendant-aware category filter
//   min_price        (number)    inclusive lower bound on final_price
//   max_price        (number)    inclusive upper bound on final_price
//   sort             (string)    price_asc | price_desc | date_asc | date_desc (default date_desc)
//   page             (number)    1-indexed, default 1
//   limit            (number)    default 20, max 100

const ALLOWED_SORTS: PublicProductSort[] = ['price_asc', 'price_desc', 'date_asc', 'date_desc']

function num(value: string | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const categoryId = num(sp.get('category_id'))
    const minPrice = num(sp.get('min_price'))
    const maxPrice = num(sp.get('max_price'))
    const sortParam = sp.get('sort') as PublicProductSort | null
    const sort = sortParam && ALLOWED_SORTS.includes(sortParam) ? sortParam : 'date_desc'
    const page = Math.max(1, num(sp.get('page')) ?? 1)
    const limit = num(sp.get('limit')) ?? 20

    const data = await getPublicProductsPage({
      categoryId,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    })

    // List is dynamic but cache-friendly per query for a short window.
    return apiOk(
      { data },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
    )
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// POST /api/product — Create (admin only)

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: AddProductPayload = await req.json()
    if (!body.name)             return apiError('Product name is required',       HTTP.BAD_REQUEST)
    if (!body.slug)             return apiError('Product slug is required',       HTTP.BAD_REQUEST)
    if (!body.variants?.length) return apiError('At least one variant is required', HTTP.BAD_REQUEST)

    const productId = await addAdminProduct(body)
    return apiOk(
      { data: { product_id: productId }, message: 'Product successfully created' },
      { status: HTTP.CREATED },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('DUPLICATE_ERROR'))
      return apiError(message.replace('DUPLICATE_ERROR: ', ''), HTTP.CONFLICT)
    return toApiError(error)
  }
}

// PATCH /api/product — Update (admin only)

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: UpdateProductPayload & { product_id: number } = await req.json()
    if (!body.product_id)       return apiError('product_id is required',         HTTP.BAD_REQUEST)
    if (!body.name)             return apiError('Product name is required',       HTTP.BAD_REQUEST)
    if (!body.slug)             return apiError('Product slug is required',       HTTP.BAD_REQUEST)
    if (!body.variants?.length) return apiError('At least one variant is required', HTTP.BAD_REQUEST)

    const { product_id, ...rest } = body
    const productId = await updateAdminProduct(product_id, rest)
    return apiOk({ data: { product_id: productId }, message: 'Product successfully updated' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('NOT_FOUND_ERROR'))
      return apiError(message.replace('NOT_FOUND_ERROR: ', ''), HTTP.NOT_FOUND)
    if (message.includes('DUPLICATE_ERROR'))
      return apiError(message.replace('DUPLICATE_ERROR: ', ''), HTTP.CONFLICT)
    return toApiError(error)
  }
}

// PUT /api/product — Restore an archived product (admin only)

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: { product_id: number } = await req.json()
    if (!body.product_id) return apiError('product_id is required', HTTP.BAD_REQUEST)

    await restoreProduct(body.product_id)
    return apiOk({ data: { product_id: body.product_id }, message: 'Product successfully restored' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('Product not found')) return apiError('Product not found', HTTP.NOT_FOUND)
    return toApiError(error)
  }
}

// DELETE /api/product — Soft-delete a product (admin only)

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return apiError(auth.message, auth.status)

    const body: { product_id: number } = await req.json()
    if (!body.product_id) return apiError('product_id is required', HTTP.BAD_REQUEST)

    await softDeleteProduct(body.product_id)
    return apiOk({ data: { product_id: body.product_id }, message: 'Product successfully archived' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('Product not found')) return apiError('Product not found', HTTP.NOT_FOUND)
    return toApiError(error)
  }
}
