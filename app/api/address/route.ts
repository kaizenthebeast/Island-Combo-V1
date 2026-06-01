import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { insertAddressInfo, updateAddressInfo, deleteAddress } from '@/lib/address'
import type { AddressFormValues } from '@/types/users'
import { HTTP, apiError, apiResult, toApiError } from '@/lib/api/respond'

// All address mutations are self-scoped — the underlying lib functions derive
// user_id from the session and RLS enforces the boundary. requireUser is the
// API-layer guard so unauthenticated callers fail fast with a clean 401.
// Reads (getUserAddress) stay server-to-client; no GET handler.

// POST /api/address — add a new address
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body = (await req.json()) as AddressFormValues
    return apiResult(await insertAddressInfo(body))
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// PATCH /api/address — update an existing address
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { addressId, ...data } = (await req.json()) ?? {}
    if (!addressId) return apiError('addressId is required', HTTP.BAD_REQUEST)

    return apiResult(await updateAddressInfo(addressId, data as AddressFormValues))
  } catch (error: unknown) {
    return toApiError(error)
  }
}

// DELETE /api/address — remove an address
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const { addressId } = (await req.json()) ?? {}
    if (!addressId) return apiError('addressId is required', HTTP.BAD_REQUEST)

    return apiResult(await deleteAddress(addressId))
  } catch (error: unknown) {
    return toApiError(error)
  }
}
