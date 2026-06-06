-- ─────────────────────────────────────────────────────────────────────────────
-- Pending checkout (PayPal webhook fulfillment safety net)
--
-- At /api/checkout?phase=create (card), the server-trusted create_order args are
-- saved here keyed by the PayPal order id. If the buyer's browser dies after the
-- capture, the paypal-webhook edge function calls fulfill_pending_checkout, which
-- creates the order from the stored payload — so a paid order is never lost.
--
-- fulfill_pending_checkout REUSES create_order (no duplicate order logic, no
-- money-path change): it impersonates the stored user via request.jwt.claims so
-- create_order's auth.uid() resolves to them, then calls it normally. create_order
-- is idempotent on the capture id, so the browser path and the webhook can both
-- run without creating a duplicate.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pending_checkout (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paypal_order_id text NOT NULL UNIQUE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload         jsonb NOT NULL,        -- the create_order args (server-trusted)
  fulfilled       boolean NOT NULL DEFAULT false,
  fulfilled_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_checkout ENABLE ROW LEVEL SECURITY;

-- The app (as the user) records its own pending checkout. Reads/fulfillment happen
-- via the SECURITY DEFINER RPC (service-role from the webhook), so no SELECT policy.
DROP POLICY IF EXISTS pending_checkout_insert_own ON public.pending_checkout;
CREATE POLICY pending_checkout_insert_own ON public.pending_checkout
  FOR INSERT WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.pending_checkout FROM public, anon;
GRANT INSERT ON public.pending_checkout TO authenticated;

CREATE OR REPLACE FUNCTION public.fulfill_pending_checkout(p_paypal_order_id text, p_capture_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pc    public.pending_checkout;
  v_order public.orders;
BEGIN
  IF p_paypal_order_id IS NULL OR p_capture_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Idempotent: if an order already exists for this capture, we're done.
  SELECT * INTO v_order FROM public.orders WHERE paypal_capture_id = p_capture_id LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('public_ref', v_order.public_ref, 'already', true);
  END IF;

  SELECT * INTO v_pc FROM public.pending_checkout
  WHERE paypal_order_id = p_paypal_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_pc.fulfilled THEN
    RETURN NULL;
  END IF;

  -- Impersonate the buyer so create_order's auth.uid() resolves to them.
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_pc.user_id::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );

  v_order := public.create_order(
    p_items            => v_pc.payload->'items',
    p_address_id       => NULLIF(v_pc.payload->>'address_id', '')::bigint,
    p_fulfillment      => v_pc.payload->>'fulfillment',
    p_payment_method   => v_pc.payload->>'payment_method',
    p_shipping_fee     => coalesce((v_pc.payload->>'shipping_fee')::numeric, 0),
    p_discount_amount  => coalesce((v_pc.payload->>'discount_amount')::numeric, 0),
    p_promo_code       => NULLIF(v_pc.payload->>'promo_code', ''),
    p_total_amount     => (v_pc.payload->>'total_amount')::numeric,
    p_paypal_order_id  => p_paypal_order_id,
    p_paypal_capture_id=> p_capture_id,
    p_points_redeemed  => coalesce((v_pc.payload->>'points_redeemed')::integer, 0)
  );

  UPDATE public.pending_checkout SET fulfilled = true, fulfilled_at = now() WHERE id = v_pc.id;

  RETURN jsonb_build_object('public_ref', v_order.public_ref, 'order_id', v_order.order_id);
END;
$$;

-- Only the service role (the webhook) fulfills — never customers directly.
REVOKE ALL ON FUNCTION public.fulfill_pending_checkout(text, text) FROM public, anon, authenticated;
