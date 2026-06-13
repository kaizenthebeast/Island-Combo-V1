# Supabase Edge Functions & scheduled jobs

What runs **outside** the Next.js request path. Anything atomic/transactional stays
in DB RPCs + RLS (see the migrations); edge functions are only for reaching outside
Postgres (third-party APIs) and incoming webhooks.

| Job | Where it lives | Trigger | Status |
|---|---|---|---|
| Abandoned-guest cleanup | **pg_cron + SQL** (`prune_abandoned_guests`, migration 0021) | daily 03:00 UTC | ✅ live |
| Loyverse points sync | edge function `loyverse-points-sync` | scheduled | ⏳ needs deploy + token |
| PayPal fulfillment webhook | edge function `paypal-webhook` | PayPal webhook | ⏳ needs deploy + config |
| Transactional email (Resend) | edge function `send-email` | invoked by the app | ⏳ needs `RESEND_API_KEY` |

The cleanup is **not** an edge function on purpose — pruning DB rows belongs in the
database (no network hop). It's already scheduled.

---

## send-email (transactional email via Resend)

The app's single outbound mail channel. It replaced an unused SMTP/nodemailer
placeholder that never sent anything. The function (not the Next app) holds the
Resend key, so there's no mail credential in the app env — same reasoning as
`invite-user` holding the service key.

It is **not an open relay**: callers pass only a record id + a `type`, and the
function re-verifies the caller, then re-derives the recipient and all content
from trusted DB rows. Three types:

| `type` | When | Who may call | Recipient |
|---|---|---|---|
| `order_update` | staff move an order to a milestone status (`shipped`, `out_for_delivery`, `delivered`, `completed`, `cancelled`) | staff/admin | the order's customer |
| `voucher_issued` | a cash voucher is created — includes a scannable QR (inline + attached) | the voucher's purchaser (or staff) | `recipient_email ?? purchaser_email` |
| `voucher_redeemed` | staff redeem a voucher in store ("cash claimed" alert) | staff/admin | `recipient_email ?? purchaser_email` |

The app invokes it through `shared/lib/email/sendTransactionalEmail.ts`, which is
**best-effort**: a mail failure is logged and swallowed so it never breaks the
order/voucher/status-change it accompanies.

```bash
supabase functions deploy send-email          # keep verify_jwt ON
supabase secrets set RESEND_API_KEY=re_...     # until set, the function is a safe no-op
# Optional overrides (sensible defaults baked in):
supabase secrets set \
  RESEND_FROM='Island Combo <onboarding@resend.dev>' \
  SITE_URL=https://island-combo.onrender.com
```

**Sender caveat:** the default `onboarding@resend.dev` is Resend's test sender — it
only delivers to your own Resend-account email. To reach real recipients, verify a
domain in Resend and repoint `RESEND_FROM` (secret change only, no code change).

---

## paypal-webhook (reliable card fulfillment)

The DB side is done and tested: `pending_checkout` (the app records server-trusted
order args at `/api/checkout?phase=create`) and `fulfill_pending_checkout(...)`
(migration 0022), which reuses `create_order` by impersonating the buyer and is
idempotent on the capture id. The edge function just verifies + forwards.

```bash
supabase functions deploy paypal-webhook --no-verify-jwt   # PayPal can't send a Supabase JWT; we verify PayPal's signature instead
supabase secrets set \
  PAYPAL_CLIENT_ID=...        PAYPAL_CLIENT_SECRET=... \
  PAYPAL_WEBHOOK_ID=...       PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

Then in the **PayPal Dashboard → Webhooks**: add the function URL
(`https://<project-ref>.supabase.co/functions/v1/paypal-webhook`), subscribe to
**PAYMENT.CAPTURE.COMPLETED**, and paste the generated **Webhook ID** into the secret above.

**Test in sandbox** (PayPal Webhooks → "Send test event", or complete a real sandbox
order and kill the tab right after approving). Confirm the order appears even though
the browser never finished — and that a normal completion does **not** create a
duplicate (idempotent on capture id).

---

## loyverse-points-sync (legacy points import)

Stages Loyverse customers/balances into `loyverse_card`; customers claim them in-app.

```bash
supabase functions deploy loyverse-points-sync
supabase secrets set LOYVERSE_API_TOKEN=...   # until set, the function is a safe no-op
```

Schedule it (daily). Easiest is **Dashboard → Edge Functions → Schedules** (cron).
Or, from SQL with `pg_net` enabled:

```sql
create extension if not exists pg_net;
select cron.schedule('loyverse-sync', '0 4 * * *', $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/loyverse-points-sync',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
  );
$$);
```

---

## Cleanup cron (already live — for reference)

```sql
-- runs daily 03:00 UTC; deletes anonymous guests >30 days old with no orders/vouchers/reviews
select public.prune_abandoned_guests(30);   -- run manually anytime
select * from cron.job where jobname = 'prune-abandoned-guests';
```
