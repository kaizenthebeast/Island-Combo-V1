import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Server-side PayPal (Orders v2) client. All card data is handled by PayPal's
// hosted Card Fields on the client and never reaches us — here we only create
// and capture orders with a server-trusted amount.
//
// Required env:
//   PAYPAL_CLIENT_ID      (falls back to NEXT_PUBLIC_PAYPAL_CLIENT_ID)
//   PAYPAL_CLIENT_SECRET  (server-only — never expose to the client)
//   PAYPAL_API_BASE       (optional; defaults to sandbox)
// ─────────────────────────────────────────────────────────────────────────────

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE
const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const CURRENCY = process.env.PAYPAL_CURRENCY

export type CapturedPayment = {
  captureId: string
  amount: number
  currency: string
  status: string
}

const getAccessToken = async (): Promise<string> => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('PayPal is not configured (missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).')
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Could not authenticate with PayPal.')
  }

  const json = (await res.json()) as { access_token: string }
  return json.access_token
}

// Creates a CAPTURE-intent order for the given amount. The amount is the
// authoritative value the buyer will be charged. `requestId` is PayPal's
// idempotency key (PayPal-Request-Id): retrying with the same key returns the
// same order instead of creating a duplicate.
export const createPayPalOrder = async (
  amount: number,
  requestId?: string,
): Promise<{ id: string }> => {
  const token = await getAccessToken()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (requestId) headers['PayPal-Request-Id'] = requestId

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: CURRENCY, value: amount.toFixed(2) },
          description: 'Island Combo Cash Voucher',
        },
      ],
    }),
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.message ?? 'Could not create the PayPal order.')
  }

  return { id: json.id as string }
}

// Captures an approved order and returns the settled payment details, read back
// from PayPal (not the client) so the amount can be trusted.
export const capturePayPalOrder = async (orderId: string): Promise<CapturedPayment> => {
  const token = await getAccessToken()

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Idempotency key derived from the order — a retried capture returns the
      // same result instead of attempting a second charge.
      'PayPal-Request-Id': `capture-${orderId}`,
    },
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.message ?? 'Could not capture the PayPal payment.')
  }

  const capture = json?.purchase_units?.[0]?.payments?.captures?.[0]
  if (!capture || capture.status !== 'COMPLETED') {
    throw new Error('Payment was not completed.')
  }

  return {
    captureId: capture.id,
    amount: Number(capture.amount.value),
    currency: capture.amount.currency_code,
    status: capture.status,
  }
}
