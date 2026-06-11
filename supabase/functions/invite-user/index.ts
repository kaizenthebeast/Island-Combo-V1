// Supabase Edge Function: invite-user
//
// Provisions a new back-office account (role: staff | admin): sends a Supabase
// invite email (the invitee sets their own password) and inserts the profile
// row with the chosen role at invite time, so the custom-access-token hook tags
// the invitee's very first JWT correctly. Called by the Next app's
// inviteUser() lib, which forwards the calling admin's session JWT.
//
// Lives here (not in Next) so the privileged client uses the platform-injected
// SUPABASE_SERVICE_ROLE_KEY — no secret key to manage in the app's env. The
// function independently re-verifies the caller is an active admin.
//
// Deploy:   supabase functions deploy invite-user        (keep verify_jwt ON —
//           only authenticated users can invoke; we additionally check admin.)
// Secrets:  none beyond the injected SUPABASE_URL / SUPABASE_ANON_KEY /
//           SUPABASE_SERVICE_ROLE_KEY.
//
// Outcome convention: business outcomes (sent OR a handled refusal like
// "email already exists") return HTTP 200 with { ok }. Non-2xx is reserved for
// auth/input/system errors.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const ROLES = ['staff', 'admin'] as const

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'unauthorized' }, 401)

  // Re-verify the caller is an ACTIVE admin (defense in depth; the app already
  // gated this with requireAdmin). Same pattern as paypal-refund.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401)

  const { data: callerProfile } = await userClient
    .from('profile').select('role, is_active').eq('user_id', user.id).maybeSingle()
  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.is_active) {
    return json({ ok: false, error: 'forbidden: admin access required' }, 403)
  }

  // Input — mirrors the app's inviteUserSchema (zod re-validated there).
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : ''
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : ''
  const role = body.role
  // The invite email's landing page. Caller-supplied is safe: GoTrue only
  // honours redirect URLs on the project's allow-list.
  const redirectTo = typeof body.redirect_to === 'string' ? body.redirect_to : undefined

  if (!email || !firstName || !lastName) {
    return json({ ok: false, error: 'email, first_name and last_name are required' }, 400)
  }
  if (!ROLES.includes(role)) {
    return json({ ok: false, error: "role must be 'staff' or 'admin'" }, 400)
  }

  // Privileged client — service key injected by the platform. Bypasses RLS for
  // the profile insert (service_role holds the minimal grants from 0051) and
  // unlocks the GoTrue admin API.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    // Traceability only — the authoritative role lives on the profile row.
    data: {
      first_name: firstName,
      last_name: lastName,
      invited_role: role,
      invited_by: user.id,
    },
    redirectTo,
  })

  if (inviteError || !invited?.user) {
    const exists = inviteError?.code === 'email_exists'
    // Handled refusal → 200 with ok:false so the app shows the reason cleanly.
    return json({
      ok: false,
      error: exists ? 'An account with this email already exists.' : inviteError?.message ?? 'Failed to send the invitation.',
      code: exists ? 'email_exists' : 'invite_failed',
    }, exists ? 200 : 502)
  }

  // Tag the role now: the custom-access-token hook reads profile.role when the
  // invitee's session is issued. (BEFORE INSERT trigger fills the loyalty card
  // number; the on_auth_user_created trigger creates profile_pts.)
  const { error: profileError } = await admin.from('profile').insert({
    user_id: invited.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
  })

  // Without a profile the invitee would land as a plain customer — roll the
  // auth user back so the admin can simply retry.
  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id)
    return json({ ok: false, error: `Failed to provision the account: ${profileError.message}` }, 502)
  }

  return json({ ok: true, user_id: invited.user.id, email, role })
})
