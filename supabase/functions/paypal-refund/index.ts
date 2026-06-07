// Supabase Edge Function: paypal-refund
//
// Issues a refund against a PayPal capture. Called by the admin Refunds queue
// when staff APPROVE a refund request (after a password 2FA step in the app).
// The function independently re-verifies the caller is staff/admin, then calls
// PayPal's capture-refund API and returns the refund id + status.
//
// Deploy:   supabase functions deploy paypal-refund      (keep verify_jwt ON —
//           only authenticated users can invoke; we additionally check the role.)
// Secrets:  reuses PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_API_BASE
//           (already set for paypal-webhook). SUPABASE_URL / SUPABASE_ANON_KEY
//           are injected automatically.
//
// Outcome convention: business outcomes (PayPal success OR a PayPal refusal)
// return HTTP 200 with { ok }. Non-2xx is reserved for auth/input/system errors.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const PP_BASE = Deno.env.get('PAYPAL_API_BASE') ?? 'https://api-m.sandbox.paypal.com'

async function paypalAccessToken(): Promise<string | null> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID')!
  const secret = Deno.env.get('PAYPAL_CLIENT_SECRET')!
  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json().catch(() => ({}))
  return data.access_token ?? null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'unauthorized' }, 401)

  // Re-verify the caller is staff/admin (defense in depth; the app already gated
  // this with requireStaff + a password 2FA).
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401)

  const { data: profile } = await userClient
    .from('profile').select('role').eq('user_id', user.id).maybeSingle()
  if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
    return json({ ok: false, error: 'forbidden' }, 403)
  }

  const { capture_id, amount, currency } = await req.json().catch(() => ({}))
  if (!capture_id) return json({ ok: false, error: 'capture_id is required' }, 400)

  const token = await paypalAccessToken()
  if (!token) return json({ ok: false, error: 'could not authenticate with PayPal' }, 502)

  // Omit amount for a full refund; include it for a partial.
  const body = amount != null
    ? JSON.stringify({ amount: { value: Number(amount).toFixed(2), currency_code: currency ?? 'USD' } })
    : '{}'

  const res = await fetch(`${PP_BASE}/v2/payments/captures/${capture_id}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // PayPal refused (e.g. already refunded, insufficient funds) — surface it as a
    // handled outcome so the app can show the reason without a thrown error.
    const message = data?.details?.[0]?.description ?? data?.message ?? 'PayPal refused the refund'
    return json({ ok: false, error: message, paypal: data }, 200)
  }

  return json({ ok: true, refund_id: data.id, status: data.status })
})
