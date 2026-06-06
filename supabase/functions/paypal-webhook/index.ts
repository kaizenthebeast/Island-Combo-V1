// Supabase Edge Function: paypal-webhook
//
// Reliability net for card checkout. Today an order is created only if the
// buyer's browser completes /api/checkout?phase=capture. If the tab dies right
// after PayPal captures the money, the payment succeeded but no order exists.
// PayPal also calls THIS endpoint server-side on PAYMENT.CAPTURE.COMPLETED, so we
// can guarantee fulfillment independent of the browser.
//
// Deploy:   supabase functions deploy paypal-webhook --no-verify-jwt
//           (--no-verify-jwt because PayPal can't send a Supabase JWT; we verify
//            authenticity via PayPal's webhook SIGNATURE instead — below.)
// Configure: PayPal Dashboard → Webhooks → add this function URL, subscribe to
//            PAYMENT.CAPTURE.COMPLETED, copy the Webhook ID.
// Secrets:   supabase secrets set PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=... \
//              PAYPAL_WEBHOOK_ID=... PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
//            (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected.)
//
// SECURITY: never trust the body until verify-webhook-signature returns SUCCESS.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const PP_BASE = Deno.env.get('PAYPAL_API_BASE') ?? 'https://api-m.sandbox.paypal.com'

async function paypalAccessToken(): Promise<string> {
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
  const data = await res.json()
  return data.access_token
}

// Verify the event is genuinely from PayPal using the transmission headers.
async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const token = await paypalAccessToken()
  const res = await fetch(`${PP_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: Deno.env.get('PAYPAL_WEBHOOK_ID'),
      webhook_event: JSON.parse(rawBody),
    }),
  })
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405)

  const rawBody = await req.text()
  if (!(await verifySignature(req, rawBody))) {
    return json({ ok: false, error: 'invalid signature' }, 401)
  }

  const event = JSON.parse(rawBody)
  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return json({ ok: true, ignored: event.event_type })
  }

  // The capture resource carries the capture id; its supplementary data links to
  // the PayPal *order* id we keyed the pending checkout on.
  const captureId: string | undefined = event.resource?.id
  const paypalOrderId: string | undefined =
    event.resource?.supplementary_data?.related_ids?.order_id

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Already fulfilled? create_order is idempotent on the capture id, so if an
  // order already exists for this capture we're done (the browser path won).
  const { data: existing } = await supabase
    .from('orders').select('order_id').eq('paypal_capture_id', captureId).maybeSingle()
  if (existing) return json({ ok: true, alreadyFulfilled: true })

  // Otherwise complete it from the stored pending checkout (see README / the
  // fulfill_pending_checkout RPC). The args were resolved + server-trusted at
  // /api/checkout?phase=create and saved keyed by the PayPal order id.
  const { data: result, error } = await supabase.rpc('fulfill_pending_checkout', {
    p_paypal_order_id: paypalOrderId,
    p_capture_id: captureId,
  })

  if (error) return json({ ok: false, error: error.message }, 500)
  return json({ ok: true, fulfilled: result })
})
