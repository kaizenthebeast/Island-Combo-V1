-- ─────────────────────────────────────────────────────────────────────────────
-- Stock-safe, race-free cart upsert.
--
-- The client must never be able to put more of a SKU in the cart than there is
-- stock. The danger is concurrency, e.g.:
--
--   • User A checks out (create_order, 0007) and decrements product_variants.stock
--   • User B adds the same variant to their cart, at the same moment
--
-- If B reads stock before A's decrement commits, B can over-reserve. To prevent
-- this we take a row lock on the variant FIRST (SELECT ... FOR UPDATE). That lock
-- is the same row create_order UPDATEs, so:
--
--   • While create_order holds the variant row, this function blocks.
--   • When it resumes, it re-reads the freshly committed stock value.
--   • Two cart writes against the same variant also serialize on this lock, so
--     the "existing quantity" read below is always consistent — which is why we
--     don't need a unique (user_id, variant_id) constraint to upsert safely.
--
-- One function, two modes:
--   • 'add' → increment the existing line by p_quantity (the "add to cart" path)
--   • 'set' → replace the line quantity with p_quantity (the quantity-stepper path)
--
-- SECURITY DEFINER + auth.uid(): the row is always scoped to the caller, the
-- client can never write another user's cart, and RLS is bypassed safely the
-- same way create_order / create_cash_voucher already do.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cart_upsert_item(
  p_variant_id      bigint,
  p_quantity        integer,
  p_selected_option text DEFAULT NULL,
  p_mode            text DEFAULT 'add'
)
RETURNS public.cart
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_stock        integer;
  v_active       boolean;
  v_existing     public.cart;
  v_new_quantity integer;
  v_row          public.cart;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  IF p_variant_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'A valid variant and quantity are required' USING errcode = '22023';
  END IF;

  IF p_mode NOT IN ('add', 'set') THEN
    RAISE EXCEPTION 'Invalid cart mode' USING errcode = '22023';
  END IF;

  -- Lock the variant row FIRST. A concurrent create_order (which UPDATEs this
  -- same row) or a concurrent cart write on the same variant blocks here until
  -- it commits, so the stock we read next is guaranteed to be the latest value.
  SELECT stock, is_active
    INTO v_stock, v_active
  FROM public.product_variants
  WHERE variant_id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND OR v_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Product is no longer available' USING errcode = 'P0002';
  END IF;

  -- Existing line for this user+variant. variant_id alone identifies the SKU;
  -- selected_option is display-only. Read happens AFTER the lock above, so it
  -- reflects any cart write a competing transaction just committed.
  SELECT * INTO v_existing
  FROM public.cart
  WHERE user_id = v_uid AND variant_id = p_variant_id;

  IF p_mode = 'add' THEN
    v_new_quantity := coalesce(v_existing.quantity, 0) + p_quantity;
  ELSE
    v_new_quantity := p_quantity;
  END IF;

  -- The whole point: never let the cart exceed what is in stock.
  IF v_new_quantity > v_stock THEN
    RAISE EXCEPTION 'Only % left in stock', v_stock USING errcode = '23514';
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.cart
    SET quantity        = v_new_quantity,
        selected_option = coalesce(p_selected_option, selected_option),
        updated_at      = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.cart (user_id, variant_id, quantity, selected_option)
    VALUES (v_uid, p_variant_id, v_new_quantity, p_selected_option)
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

-- Grants — only an authenticated session may touch its own cart.
REVOKE ALL ON FUNCTION public.cart_upsert_item(bigint, integer, text, text)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cart_upsert_item(bigint, integer, text, text)
  TO authenticated;
