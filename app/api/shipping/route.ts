import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { HTTP, apiOk, apiError, toApiError } from '@/shared/lib/http/respond'
import { quoteShipping, type ShippingItem } from '@/features/shipping/api/quote'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return apiError('Unauthorized', HTTP.UNAUTHORIZED)

    const body = await request.json()
    const { zone, country, postalCode, items } = body as {
      zone?: string
      country?: string
      postalCode?: string
      items?: ShippingItem[]
    }

    if (!zone || typeof zone !== 'string') {
      return apiError("Missing or invalid 'zone'", HTTP.BAD_REQUEST)
    }

    const quote = quoteShipping(zone, items)
    if (!quote) {
      return apiError(`No shipping rates available for zone '${zone}'`, HTTP.BAD_REQUEST)
    }

    return apiOk({
      data: {
        ...quote,
        country: country ?? null,
        postalCode: postalCode ?? null,
      },
    })
  } catch (error: unknown) {
    return toApiError(error)
  }
}
