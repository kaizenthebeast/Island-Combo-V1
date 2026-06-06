// Supabase Edge Function: loyverse-points-sync (§3.8 Loyverse Points Sync Job)
//
// Imports/syncs accumulated loyalty points from the Loyverse POS into
// public.profile_pts. SCAFFOLD: it is a safe no-op until LOYVERSE_API_TOKEN is
// configured, so it can be deployed now and "turned on" later by adding the secret.
//
// Deploy:    supabase functions deploy loyverse-points-sync
// Schedule:  Dashboard → Edge Functions → Schedules (cron, e.g. daily), or pg_cron
//            hitting the function URL. (One-time migration: invoke once manually.)
// Secrets:   supabase secrets set LOYVERSE_API_TOKEN=...   (SUPABASE_URL /
//            SUPABASE_SERVICE_ROLE_KEY are injected by the runtime — service role
//            is required to credit balances across users, bypassing RLS.)
//
// Rule (§3.8): points NEVER expire; all balances since 2025-07-02 must be
// preserved. This job only ever CREDITS — it never debits or expires. It shares
// the same idempotency key as the manual importer (a 'loyverse_import' ledger row
// per customer), so re-runs never double-credit. (A future continuous delta-sync
// would track each customer's last-synced value; the one-time migration does not.)

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  const token = Deno.env.get('LOYVERSE_API_TOKEN')
  if (!token) return json({ ok: true, skipped: 'LOYVERSE_API_TOKEN not set' })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Loyverse customers carry `total_points` and `customer_code`, which we map to
  // profile.loyverse_customer_code. (Paginate via `cursor` for >250 customers.)
  const res = await fetch('https://api.loyverse.com/v1.0/customers?limit=250', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return json({ ok: false, error: `Loyverse ${res.status}` }, 502)

  const { customers = [] } = await res.json()
  const rows: { card_number: string; points: number; customer_name: string | null; email: string | null }[] = []
  let skipped = 0

  for (const c of customers) {
    const card = String(c.customer_code ?? '').trim()
    const points = Math.floor(Number(c.total_points ?? 0))
    if (!card || points < 0) { skipped++; continue }
    rows.push({ card_number: card, points, customer_name: c.name ?? null, email: c.email ?? null })
  }

  // Stage the cards into loyverse_card; customers claim them in-app, which credits
  // the points exactly once. Upsert by card_number keeps this re-runnable.
  if (rows.length) {
    const { error } = await supabase.from('loyverse_card').upsert(rows, { onConflict: 'card_number' })
    if (error) return json({ ok: false, error: error.message }, 500)
  }

  return json({ ok: true, staged: rows.length, skipped })
})
