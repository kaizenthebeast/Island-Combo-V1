-- ─────────────────────────────────────────────────────────────────────────────
-- #2  Normalize payment facts into their own table.
--
-- Payment data (paypal_order_id/capture_id/payer_email) was denormalized onto
-- `orders`, which is fine for one capture per order but has no room for refunds
-- or multiple attempts. `payments` is a child of orders; create_order writes one
-- row per order (wired in 0030). orders.paypal_* stay for now (webhook + reads
-- still use them) — a future migration can drop them once reads move here.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id           bigint NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  method             text   NOT NULL,                 -- 'cod' | 'card'
  provider           text   NOT NULL,                 -- 'cod' | 'paypal'
  amount             numeric NOT NULL DEFAULT 0,
  currency           text   NOT NULL DEFAULT 'USD',
  status             text   NOT NULL DEFAULT 'pending',-- 'pending' | 'completed' | 'cancelled' | 'refunded'
  paypal_order_id    text,
  paypal_capture_id  text,
  payer_email        text,
  captured_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_id_idx ON public.payments (order_id);
-- One payment per PayPal capture — supports the webhook's idempotency.
CREATE UNIQUE INDEX payments_capture_id_uidx
  ON public.payments (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Reads: the order's owner or any staff (mirrors orders_select).
CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated
USING (
  (SELECT public.is_staff())
  OR EXISTS (SELECT 1 FROM public.orders o
             WHERE o.order_id = payments.order_id
               AND o.user_id = (SELECT auth.uid()))
);
-- Direct writes are staff-only; create_order writes via SECURITY DEFINER (bypasses RLS).
CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff()));
CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated
  USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));
CREATE POLICY payments_delete ON public.payments FOR DELETE TO authenticated
  USING ((SELECT public.is_staff()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- Backfill one payment per existing order from its denormalized payment columns.
INSERT INTO public.payments
  (order_id, method, provider, amount, currency, status,
   paypal_order_id, paypal_capture_id, payer_email, captured_at, created_at)
SELECT
  o.order_id,
  o.payment_method,
  CASE WHEN o.payment_method = 'card' THEN 'paypal' ELSE 'cod' END,
  coalesce(o.total_amount, 0),
  'USD',
  CASE
    WHEN o.order_status = 'cancelled' THEN 'cancelled'
    WHEN o.order_status IN ('paid','shipped','out_for_delivery','delivered','completed') THEN 'completed'
    WHEN o.paypal_capture_id IS NOT NULL THEN 'completed'
    ELSE 'pending'
  END,
  o.paypal_order_id, o.paypal_capture_id, o.paypal_payer_email,
  CASE WHEN o.paypal_capture_id IS NOT NULL THEN o.created_at END,
  o.created_at
FROM public.orders o;
