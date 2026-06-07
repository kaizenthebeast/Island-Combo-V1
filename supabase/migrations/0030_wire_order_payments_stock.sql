-- ─────────────────────────────────────────────────────────────────────────────
-- #1+#2+#3 wiring (single create_order redefinition, after all tables exist):
--   • snapshot product_name + sku onto each order_items line
--   • write one payments row per order
--   • log a stock_movements row per line (delta + balance_after)
-- All writes live AFTER the paypal_capture_id idempotency early-return, so PayPal
-- retries never double-write. order_items.product_name is locked to NOT NULL once
-- create_order is guaranteed to populate it. (Admin product stock logging is in
-- 0030b.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb, p_address_id bigint, p_fulfillment text, p_payment_method text,
  p_shipping_fee numeric DEFAULT 0, p_discount_amount numeric DEFAULT 0,
  p_promo_code text DEFAULT NULL::text, p_total_amount numeric DEFAULT NULL::numeric,
  p_paypal_order_id text DEFAULT NULL::text, p_paypal_capture_id text DEFAULT NULL::text,
  p_points_redeemed integer DEFAULT 0)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid        uuid := auth.uid();
  v_order      public.orders;
  v_address    public.addresses;
  v_shipping   text;
  v_phone      text;
  v_status     text;
  v_item       jsonb;
  v_variant_id bigint;
  v_quantity   integer;
  v_unit_price numeric;
  v_base_price numeric;
  v_stock      integer;
  v_active     boolean;
  v_balance    integer;
  v_sku        text;       -- snapshot: variant sku
  v_pname      text;       -- snapshot: product name
  v_new_stock  integer;    -- on-hand after decrement (for the ledger)
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  IF p_paypal_capture_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE paypal_capture_id = p_paypal_capture_id LIMIT 1;
    IF FOUND THEN RETURN v_order; END IF;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item' USING errcode = '22023';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method' USING errcode = '22023';
  END IF;

  v_status := CASE WHEN p_payment_method = 'card' AND p_paypal_capture_id IS NOT NULL THEN 'paid' ELSE 'pending' END;

  IF p_fulfillment = 'pickup' THEN
    v_shipping := 'Store Pickup — Island Combo, Dolonier, Kolonia, FSM';
    SELECT phone_text INTO v_phone FROM public.profile WHERE user_id = v_uid;
  ELSE
    SELECT * INTO v_address FROM public.addresses WHERE id = p_address_id AND user_id = v_uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Delivery address not found' USING errcode = 'P0002'; END IF;
    v_shipping := concat_ws(', ', v_address.address, v_address.locality, btrim(concat_ws(' ', v_address.country, v_address.postal_code)));
    SELECT phone_text INTO v_phone FROM public.profile WHERE user_id = v_uid;
  END IF;

  IF v_phone IS NULL OR length(btrim(v_phone)) = 0 THEN
    RAISE EXCEPTION 'A phone number is required on your profile to place an order' USING errcode = '22023';
  END IF;

  INSERT INTO public.orders (
    user_id, order_status, shipping_address, phone_number, payment_method,
    sync_status, paypal_order_id, paypal_capture_id,
    discount_amount, promo_code, shipping_fee, total_amount
  )
  VALUES (
    v_uid, v_status, v_shipping, btrim(v_phone), p_payment_method,
    'pending', p_paypal_order_id, p_paypal_capture_id,
    coalesce(p_discount_amount, 0), p_promo_code, coalesce(p_shipping_fee, 0), p_total_amount
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

    -- Read price/stock/active AND snapshot the name + sku in one lock-friendly read.
    SELECT pv.price, pv.stock, pv.is_active, pv.sku, pr.name
      INTO v_base_price, v_stock, v_active, v_sku, v_pname
    FROM public.product_variants pv
    JOIN public.products pr ON pr.product_id = pv.product_id
    WHERE pv.variant_id = v_variant_id;

    IF NOT FOUND OR v_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Product is no longer available (variant %)', v_variant_id USING errcode = 'P0002';
    END IF;
    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (have %, need %)', v_variant_id, v_stock, v_quantity USING errcode = '23514';
    END IF;
    IF v_unit_price IS NULL OR v_unit_price < 0 OR v_unit_price > v_base_price THEN
      v_unit_price := v_base_price;
    END IF;

    INSERT INTO public.order_items (order_id, variant_id, quantity, price, product_name, sku)
    VALUES (v_order.order_id, v_variant_id, v_quantity, v_unit_price, v_pname, v_sku);

    UPDATE public.product_variants
      SET stock = stock - v_quantity, updated_at = now()
    WHERE variant_id = v_variant_id
    RETURNING stock INTO v_new_stock;

    -- #3: ledger the sale (signed delta + resulting on-hand).
    INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, order_id, actor)
    VALUES (v_variant_id, -v_quantity, v_new_stock, 'order', v_order.order_id, v_uid);
  END LOOP;

  -- #2: one payment row per order. Unique(paypal_capture_id) keeps it idempotent
  -- alongside the orders early-return above.
  INSERT INTO public.payments (
    order_id, method, provider, amount, status,
    paypal_order_id, paypal_capture_id, captured_at
  )
  VALUES (
    v_order.order_id, p_payment_method,
    CASE WHEN p_payment_method = 'card' THEN 'paypal' ELSE 'cod' END,
    coalesce(p_total_amount, 0),
    CASE WHEN v_status = 'paid' THEN 'completed' ELSE 'pending' END,
    p_paypal_order_id, p_paypal_capture_id,
    CASE WHEN v_status = 'paid' THEN now() END
  );

  IF coalesce(p_points_redeemed, 0) > 0 THEN
    SELECT total_pts INTO v_balance FROM public.profile_pts WHERE user_id = v_uid FOR UPDATE;
    IF coalesce(v_balance, 0) < p_points_redeemed THEN
      RAISE EXCEPTION 'Insufficient points balance to redeem' USING errcode = '22023';
    END IF;
    UPDATE public.profile_pts SET total_pts = total_pts - p_points_redeemed WHERE user_id = v_uid;
    INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
    VALUES (v_uid, v_order.order_id, -p_points_redeemed, 'Order redeem');
  END IF;

  -- Remove the ordered lines from the cart (any unselected items stay).
  DELETE FROM public.cart
  WHERE user_id = v_uid
    AND variant_id IN (SELECT variant_id FROM public.order_items WHERE order_id = v_order.order_id);

  DELETE FROM public.cart_meta WHERE user_id = v_uid;

  IF v_status = 'paid' THEN
    PERFORM public.accrue_loyalty_points(v_order.order_id);
  END IF;

  PERFORM public.log_transaction_event(
    v_order.order_id, NULL, v_status, 'client', v_uid,
    CASE WHEN v_status = 'paid' THEN 'Payment received' ELSE 'Order placed' END,
    jsonb_build_object(
      'payment_method', p_payment_method, 'fulfillment', p_fulfillment,
      'shipping_fee', coalesce(p_shipping_fee, 0), 'discount_amount', coalesce(p_discount_amount, 0),
      'promo_code', p_promo_code, 'points_redeemed', coalesce(p_points_redeemed, 0),
      'total_amount', p_total_amount, 'paypal_capture_id', p_paypal_capture_id
    )
  );

  RETURN v_order;

EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_order FROM public.orders WHERE paypal_capture_id = p_paypal_capture_id LIMIT 1;
    IF FOUND THEN RETURN v_order; END IF;
    RAISE;
END;
$function$;

-- Now that create_order always populates it, enforce the snapshot.
ALTER TABLE public.order_items ALTER COLUMN product_name SET NOT NULL;
