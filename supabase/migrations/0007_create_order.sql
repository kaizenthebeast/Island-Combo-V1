-- ─────────────────────────────────────────────────────────────────────────────
-- Product order creation, unified with the cash-voucher checkout.
--
-- A product order and a cash voucher are two kinds of the same checkout. This
-- migration gives orders the same server-side, trusted, idempotent creation path
-- the voucher already has (create_cash_voucher in 0003/0006):
--
--   • All writes go through create_order() — a SECURITY DEFINER function. There
--     is no client INSERT policy on orders/order_items, so prices and totals can
--     never be set by the client.
--   • Line prices are passed in already tier-resolved (server reads cart_view),
--     but create_order CLAMPS each unit price to <= product_variants.price, so a
--     tampered price can only ever lower the charge, never inflate the order.
--   • Stock is validated and decremented inside the same transaction.
--   • Idempotent on paypal_capture_id: replaying a capture returns the existing
--     order instead of creating a duplicate (mirrors create_cash_voucher).
--   • Logs a 'pending' transaction_event via log_transaction_event (0006).
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. orders columns the checkout total needs a home for ──────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_fee numeric NOT NULL DEFAULT 0
    CHECK (shipping_fee >= 0);



ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_amount numeric
    CHECK (total_amount IS NULL OR total_amount >= 0);

-- A given PayPal capture maps to at most one order (idempotency / reconciliation).
CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_capture_id_key
  ON public.orders (paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

-- 2. CREATE (server-side, trusted) ───────────────────────────────────────────
-- p_items: jsonb array of { "variant_id": <bigint>, "quantity": <int>, "unit_price": <numeric> }
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
  p_paypal_capture_id text   DEFAULT NULL
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
  v_item     jsonb;
  v_variant_id bigint;
  v_quantity   integer;
  v_unit_price numeric;
  v_base_price numeric;
  v_stock      integer;
  v_active     boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  -- Idempotency: a card capture can only ever map to one order.
  IF p_paypal_capture_id IS NOT NULL THEN
    SELECT * INTO v_order
    FROM public.orders
    WHERE paypal_capture_id = p_paypal_capture_id
    LIMIT 1;
    IF FOUND THEN
      RETURN v_order;
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item' USING errcode = '22023';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method' USING errcode = '22023';
  END IF;

  -- Resolve the shipping address + phone server-side.
  IF p_fulfillment = 'pickup' THEN
    v_shipping := 'Store Pickup — Island Combo, Dolonier, Kolonia, FSM';
    SELECT phone_text INTO v_phone FROM public.profile WHERE user_id = v_uid;
  ELSE
    -- Address must belong to the caller.
    SELECT * INTO v_address
    FROM public.addresses
    WHERE id = p_address_id AND user_id = v_uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Delivery address not found' USING errcode = 'P0002';
    END IF;

    v_shipping := concat_ws(', ',
      v_address.address,
      v_address.locality,
      btrim(concat_ws(' ', v_address.country, v_address.postal_code))
    );
    SELECT phone_text INTO v_phone FROM public.profile WHERE user_id = v_uid;
  END IF;

  IF v_phone IS NULL OR length(btrim(v_phone)) = 0 THEN
    RAISE EXCEPTION 'A phone number is required on your profile to place an order'
      USING errcode = '22023';
  END IF;

  -- Insert the order header first so order_items can reference it.
  INSERT INTO public.orders (
    user_id, order_status, shipping_address, phone_number, payment_method,
    sync_status, paypal_order_id, paypal_capture_id,
    discount_amount, promo_code, shipping_fee, total_amount
  )
  VALUES (
    v_uid, 'pending', v_shipping, btrim(v_phone), p_payment_method,
    'pending', p_paypal_order_id, p_paypal_capture_id,
    coalesce(p_discount_amount, 0), p_promo_code,
    coalesce(p_shipping_fee, 0), p_total_amount
  )
  RETURNING * INTO v_order;

  -- Validate each line, clamp the price, insert it, and decrement stock.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::bigint;
    v_quantity   := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    IF v_variant_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid order line' USING errcode = '22023';
    END IF;

    SELECT price, stock, is_active
      INTO v_base_price, v_stock, v_active
    FROM public.product_variants
    WHERE variant_id = v_variant_id;

    IF NOT FOUND OR v_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Product is no longer available (variant %)', v_variant_id
        USING errcode = 'P0002';
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (have %, need %)',
        v_variant_id, v_stock, v_quantity USING errcode = '23514';
    END IF;

    -- A tier can only discount: never let the recorded price exceed the base.
    IF v_unit_price IS NULL OR v_unit_price < 0 OR v_unit_price > v_base_price THEN
      v_unit_price := v_base_price;
    END IF;

    INSERT INTO public.order_items (order_id, variant_id, quantity, price)
    VALUES (v_order.order_id, v_variant_id, v_quantity, v_unit_price);

    UPDATE public.product_variants
    SET stock = stock - v_quantity, updated_at = now()
    WHERE variant_id = v_variant_id;
  END LOOP;

  PERFORM public.log_transaction_event(
    v_order.order_id, NULL, 'pending', 'client', v_uid, 'Order placed',
    jsonb_build_object(
      'payment_method', p_payment_method,
      'fulfillment', p_fulfillment,
      'shipping_fee', coalesce(p_shipping_fee, 0),
      'discount_amount', coalesce(p_discount_amount, 0),
      'promo_code', p_promo_code,
      'total_amount', p_total_amount,
      'paypal_capture_id', p_paypal_capture_id
    )
  );

  RETURN v_order;

EXCEPTION
  -- Concurrent capture replay hit the unique index — return the winner.
  WHEN unique_violation THEN
    SELECT * INTO v_order
    FROM public.orders
    WHERE paypal_capture_id = p_paypal_capture_id
    LIMIT 1;
    IF FOUND THEN
      RETURN v_order;
    END IF;
    RAISE;
END;
$$;

-- 3. Grants ──────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.create_order(jsonb, bigint, text, text, numeric, numeric, text, numeric, text, text)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, bigint, text, text, numeric, numeric, text, numeric, text, text)
  TO authenticated;
