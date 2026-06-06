-- ─────────────────────────────────────────────────────────────────────────────
-- §3.8 Loyalty: point accrual on completed orders + atomic redemption at checkout
--
-- Rates (single source of truth — redemption mirrored in lib/cart/loyalty-config.ts):
--   • Accrual:    floor(total_amount) points = 1 pt / $1 = 20 pts per $20 = $0.20 (1% back)
--   • Redemption: 100 pts = $1
--
-- Accrual triggers (§3.8): card → at payment success ('paid', in create_order);
-- COD → at completion ('delivered'/'completed', in admin_update_order_status).
-- A single shared helper with a ledger re-entrancy guard makes accrual idempotent
-- across both paths (no double-accrual).
--
-- Redemption is consumed atomically inside create_order under a row lock on
-- profile_pts, so two simultaneous checkouts can never spend the same points.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Shared accrual helper ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accrue_loyalty_points(p_order_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order   public.orders;
  v_points  integer;
  v_accrued boolean;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = p_order_id;
  IF NOT FOUND OR v_order.user_id IS NULL THEN
    RETURN;
  END IF;

  -- Re-entrancy guard: never accrue the same order twice (a positive ledger row
  -- for this order means it was already earned).
  SELECT EXISTS (
    SELECT 1 FROM public.profile_pts_transaction_records
    WHERE order_id = p_order_id AND points > 0
  ) INTO v_accrued;
  IF v_accrued THEN
    RETURN;
  END IF;

  v_points := floor(coalesce(v_order.total_amount, 0))::int;  -- 1 pt / $1 (1% back)
  IF v_points <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
  VALUES (v_order.user_id, p_order_id, v_points, 'Order earn');

  UPDATE public.profile_pts SET total_pts = total_pts + v_points
  WHERE user_id = v_order.user_id;
  IF NOT FOUND THEN
    INSERT INTO public.profile_pts (user_id, total_pts) VALUES (v_order.user_id, v_points);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accrue_loyalty_points(bigint) FROM public, anon, authenticated;

-- 2) create_order — add atomic redemption + card accrual + cart-header cleanup ─
-- A new parameter changes the signature (would create an overload), so drop the
-- old one first. p_points_redeemed is the integer points to consume, derived
-- server-side from cart_meta by lib/checkout (never client-trusted).
DROP FUNCTION IF EXISTS public.create_order(
  jsonb, bigint, text, text, numeric, numeric, text, numeric, text, text
);

CREATE OR REPLACE FUNCTION public.create_order(
  p_items            jsonb,
  p_address_id       bigint,
  p_fulfillment      text,
  p_payment_method   text,
  p_shipping_fee     numeric DEFAULT 0,
  p_discount_amount  numeric DEFAULT 0,
  p_promo_code       text    DEFAULT NULL,
  p_total_amount     numeric DEFAULT NULL,
  p_paypal_order_id  text    DEFAULT NULL,
  p_paypal_capture_id text   DEFAULT NULL,
  p_points_redeemed  integer DEFAULT 0
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_order    public.orders;
  v_address  public.addresses;
  v_shipping text;
  v_phone    text;
  v_status   text;
  v_item     jsonb;
  v_variant_id bigint;
  v_quantity   integer;
  v_unit_price numeric;
  v_base_price numeric;
  v_stock      integer;
  v_active     boolean;
  v_balance    integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  IF p_paypal_capture_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders
    WHERE paypal_capture_id = p_paypal_capture_id LIMIT 1;
    IF FOUND THEN
      RETURN v_order;  -- idempotent retry: never re-apply points
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item' USING errcode = '22023';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method' USING errcode = '22023';
  END IF;

  v_status := CASE
                WHEN p_payment_method = 'card' AND p_paypal_capture_id IS NOT NULL THEN 'paid'
                ELSE 'pending'
              END;

  IF p_fulfillment = 'pickup' THEN
    v_shipping := 'Store Pickup — Island Combo, Dolonier, Kolonia, FSM';
    SELECT phone_text INTO v_phone FROM public.profile WHERE user_id = v_uid;
  ELSE
    SELECT * INTO v_address FROM public.addresses
    WHERE id = p_address_id AND user_id = v_uid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Delivery address not found' USING errcode = 'P0002';
    END IF;
    v_shipping := concat_ws(', ',
      v_address.address, v_address.locality,
      btrim(concat_ws(' ', v_address.country, v_address.postal_code)));
    SELECT phone_text INTO v_phone FROM public.profile WHERE user_id = v_uid;
  END IF;

  IF v_phone IS NULL OR length(btrim(v_phone)) = 0 THEN
    RAISE EXCEPTION 'A phone number is required on your profile to place an order'
      USING errcode = '22023';
  END IF;

  INSERT INTO public.orders (
    user_id, order_status, shipping_address, phone_number, payment_method,
    sync_status, paypal_order_id, paypal_capture_id,
    discount_amount, promo_code, shipping_fee, total_amount
  )
  VALUES (
    v_uid, v_status, v_shipping, btrim(v_phone), p_payment_method,
    'pending', p_paypal_order_id, p_paypal_capture_id,
    coalesce(p_discount_amount, 0), p_promo_code,
    coalesce(p_shipping_fee, 0), p_total_amount
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::bigint;
    v_quantity   := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    IF v_variant_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid order line' USING errcode = '22023';
    END IF;

    SELECT price, stock, is_active INTO v_base_price, v_stock, v_active
    FROM public.product_variants WHERE variant_id = v_variant_id;

    IF NOT FOUND OR v_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Product is no longer available (variant %)', v_variant_id USING errcode = 'P0002';
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (have %, need %)',
        v_variant_id, v_stock, v_quantity USING errcode = '23514';
    END IF;

    IF v_unit_price IS NULL OR v_unit_price < 0 OR v_unit_price > v_base_price THEN
      v_unit_price := v_base_price;
    END IF;

    INSERT INTO public.order_items (order_id, variant_id, quantity, price)
    VALUES (v_order.order_id, v_variant_id, v_quantity, v_unit_price);

    UPDATE public.product_variants
    SET stock = stock - v_quantity, updated_at = now()
    WHERE variant_id = v_variant_id;
  END LOOP;

  -- Loyalty redemption — atomic, double-spend safe. The row lock serialises
  -- concurrent checkouts for this user; the balance check rejects the loser.
  -- Raising here rolls the whole order back (points + stock stay consistent).
  IF coalesce(p_points_redeemed, 0) > 0 THEN
    SELECT total_pts INTO v_balance FROM public.profile_pts WHERE user_id = v_uid FOR UPDATE;
    IF coalesce(v_balance, 0) < p_points_redeemed THEN
      RAISE EXCEPTION 'Insufficient points balance to redeem' USING errcode = '22023';
    END IF;
    UPDATE public.profile_pts SET total_pts = total_pts - p_points_redeemed WHERE user_id = v_uid;
    INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
    VALUES (v_uid, v_order.order_id, -p_points_redeemed, 'Order redeem');
  END IF;

  -- The order consumed the cart header (applied promo + points reservation).
  DELETE FROM public.cart_meta WHERE user_id = v_uid;

  -- Card accrues at payment success; COD accrues later at completion. Idempotent.
  IF v_status = 'paid' THEN
    PERFORM public.accrue_loyalty_points(v_order.order_id);
  END IF;

  PERFORM public.log_transaction_event(
    v_order.order_id, NULL, v_status, 'client', v_uid,
    CASE WHEN v_status = 'paid' THEN 'Payment received' ELSE 'Order placed' END,
    jsonb_build_object(
      'payment_method', p_payment_method,
      'fulfillment', p_fulfillment,
      'shipping_fee', coalesce(p_shipping_fee, 0),
      'discount_amount', coalesce(p_discount_amount, 0),
      'promo_code', p_promo_code,
      'points_redeemed', coalesce(p_points_redeemed, 0),
      'total_amount', p_total_amount,
      'paypal_capture_id', p_paypal_capture_id
    )
  );

  RETURN v_order;

EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_order FROM public.orders
    WHERE paypal_capture_id = p_paypal_capture_id LIMIT 1;
    IF FOUND THEN
      RETURN v_order;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(
  jsonb, bigint, text, text, numeric, numeric, text, numeric, text, text, integer
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_order(
  jsonb, bigint, text, text, numeric, numeric, text, numeric, text, text, integer
) TO authenticated;

-- 3) admin_update_order_status — accrue via the shared helper (DRY) ───────────
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id bigint, p_status text, p_delivery_notes text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.orders;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  IF p_status NOT IN ('pending','paid','shipped','out_for_delivery','delivered','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid status %', p_status USING errcode = '22023';
  END IF;

  UPDATE public.orders SET order_status = p_status, updated_at = now()
  WHERE order_id = p_order_id
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING errcode = 'P0002';
  END IF;

  PERFORM public.log_transaction_event(
    p_order_id, NULL, p_status, 'staff', v_actor,
    nullif(btrim(coalesce(p_delivery_notes, '')), ''),
    jsonb_build_object('delivery_notes', p_delivery_notes)
  );

  -- COD orders earn at completion (card already earned at payment). Idempotent.
  IF p_status IN ('delivered', 'completed') THEN
    PERFORM public.accrue_loyalty_points(p_order_id);
  END IF;

  RETURN v_order;
END;
$$;
