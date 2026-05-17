import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import {
  addAdminProduct,
  updateAdminProduct,
  softDeleteProduct,
  restoreProduct,        
  type AddProductPayload,
  type UpdateProductPayload,
} from '@/lib/product'

function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

// ─── POST /api/product ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: AddProductPayload = await req.json()
    if (!body.name)             return apiError('Product name is required', 400)
    if (!body.slug)             return apiError('Product slug is required', 400)
    if (!body.variants?.length) return apiError('At least one variant is required', 400)

    const productId = await addAdminProduct(body)

    return NextResponse.json(
      { success: true, message: 'Product successfully created', data: { product_id: productId } },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('DUPLICATE_ERROR'))
      return apiError(message.replace('DUPLICATE_ERROR: ', ''), 409)
    return apiError(message, 500)
  }
}

// ─── PATCH /api/product ───────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: UpdateProductPayload & { product_id: number } = await req.json()
    if (!body.product_id)       return apiError('product_id is required', 400)
    if (!body.name)             return apiError('Product name is required', 400)
    if (!body.slug)             return apiError('Product slug is required', 400)
    if (!body.variants?.length) return apiError('At least one variant is required', 400)

    const { product_id, ...rest } = body
    const productId = await updateAdminProduct(product_id, rest)

    return NextResponse.json(
      { success: true, message: 'Product successfully updated', data: { product_id: productId } },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('NOT_FOUND_ERROR'))
      return apiError(message.replace('NOT_FOUND_ERROR: ', ''), 404)
    if (message.includes('DUPLICATE_ERROR'))
      return apiError(message.replace('DUPLICATE_ERROR: ', ''), 409)
    return apiError(message, 500)
  }
}

// ─── PUT /api/product — Restore an archived product ──────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: { product_id: number } = await req.json()
    if (!body.product_id) return apiError('product_id is required', 400)

    await restoreProduct(body.product_id)

    return NextResponse.json(
      { success: true, message: 'Product successfully restored', data: { product_id: body.product_id } },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('Product not found'))
      return apiError('Product not found', 404)
    return apiError(message, 500)
  }
}

// ─── DELETE /api/product — Soft-delete a product ─────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', 401)

    const body: { product_id: number } = await req.json()
    if (!body.product_id) return apiError('product_id is required', 400)

    await softDeleteProduct(body.product_id)

    return NextResponse.json(
      { success: true, message: 'Product successfully archived', data: { product_id: body.product_id } },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('Product not found'))
      return apiError('Product not found', 404)
    return apiError(message, 500)
  }
}