-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotent fulfilment: one captured payment can create at most one voucher.
--
--   • A partial UNIQUE index on payment_reference (the PayPal capture id) means
--     the same capture can never produce two voucher rows. NULLs are allowed for
--     vouchers created outside the PayPal flow.
--   • create_cash_voucher() now returns the EXISTING voucher when the capture id
--     is already on file (and also catches the race via unique_violation), so a
--     double-fulfil (e.g. client + webhook) is safe.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS cash_voucher_payment_reference_key
  ON public.cash_voucher (payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_cash_voucher(
  p_amount            numeric,
  p_recipient_name    text,
  p_recipient_email   text DEFAULT NULL,
  p_payment_method    text DEFAULT NULL,
  p_payment_reference text DEFAULT NULL
)
RETURNS public.cash_voucher
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_code  text;
  v_row   public.cash_voucher;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  -- Idempotency: a given payment can only ever map to one voucher.
  IF p_payment_reference IS NOT NULL THEN
    SELECT * INTO v_row
    FROM public.cash_voucher
    WHERE payment_reference = p_payment_reference
    LIMIT 1;
    IF FOUND THEN
      RETURN v_row;
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero' USING errcode = '22023';
  END IF;

  IF p_recipient_name IS NULL OR length(btrim(p_recipient_name)) = 0 THEN
    RAISE EXCEPTION 'Recipient name is required' USING errcode = '22023';
  END IF;

  -- Buyer's email, from the authenticated user (server-trusted).
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  LOOP
    v_code := 'CV-' || to_char(now() AT TIME ZONE 'utc', 'YYYY') || '-'
              || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cash_voucher WHERE code = v_code);
  END LOOP;

  INSERT INTO public.cash_voucher (
    code, amount, status, recipient_name, recipient_email,
    purchaser_id, purchaser_email, payment_method, payment_reference
  )
  VALUES (
    v_code, p_amount, 'pending', btrim(p_recipient_name), p_recipient_email,
    v_uid, v_email, p_payment_method, p_payment_reference
  )
  RETURNING * INTO v_row;

  RETURN v_row;

EXCEPTION
  -- Concurrent fulfilment of the same payment won the race — return that row
  -- instead of failing, keeping creation idempotent.
  WHEN unique_violation THEN
    SELECT * INTO v_row
    FROM public.cash_voucher
    WHERE payment_reference = p_payment_reference
    LIMIT 1;
    RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cash_voucher(numeric, text, text, text, text) TO authenticated;
