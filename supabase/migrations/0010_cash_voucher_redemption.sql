-- ─────────────────────────────────────────────────────────────────────────────
-- Digital Voucher & Cash Redemption (Back Office).
--
-- Brings the cash voucher in line with the Digital Product spec:
--   • Status vocabulary becomes ACTIVE / REDEEMED / CANCELLED / EXPIRED.
--   • A `redeemed_recipient_name` column records the PERSON WHO EXCHANGES the
--     voucher at the counter (captured at redemption, separate from the buyer's
--     intended recipient_name).
--   • An optional `order_id` links a voucher to an order (Digital Product Table).
--   • redeem_cash_voucher() replaces claim_cash_voucher(): staff/admin only, it
--     records the back-office user_id (claimed_by), the timestamp (claimed_at)
--     and the redeemer's name, and flips status to REDEEMED so a voucher can be
--     redeemed exactly once.
--   • A BEFORE UPDATE trigger makes the redemption audit fields (user_id,
--     timestamp, redeemer name) and the REDEEMED status IMMUTABLE once set.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New columns ───────────────────────────────────────────────────────────────
ALTER TABLE public.cash_voucher
  ADD COLUMN IF NOT EXISTS redeemed_recipient_name text;

ALTER TABLE public.cash_voucher
  ADD COLUMN IF NOT EXISTS order_id bigint;

-- Link to an order if one exists (vouchers bought standalone leave this NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_voucher_order_id_fkey'
  ) THEN
    ALTER TABLE public.cash_voucher
      ADD CONSTRAINT cash_voucher_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(order_id);
  END IF;
END $$;

-- 2. Status vocabulary migration: pending/claimed/... → ACTIVE/REDEEMED/... ──────
-- Drop the default AND the old CHECK first — the old constraint only permits the
-- lowercase values, so it must be gone before the rows can be rewritten.
ALTER TABLE public.cash_voucher ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.cash_voucher DROP CONSTRAINT IF EXISTS cash_voucher_status_check;

UPDATE public.cash_voucher
SET status = CASE status
  WHEN 'pending'   THEN 'ACTIVE'
  WHEN 'claimed'   THEN 'REDEEMED'
  WHEN 'cancelled' THEN 'CANCELLED'
  WHEN 'expired'   THEN 'EXPIRED'
  ELSE status            -- already migrated (re-run): leave as-is
END;

ALTER TABLE public.cash_voucher
  ADD CONSTRAINT cash_voucher_status_check
  CHECK (status = ANY (ARRAY['ACTIVE'::text, 'REDEEMED'::text, 'CANCELLED'::text, 'EXPIRED'::text]));

ALTER TABLE public.cash_voucher ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- 3. Immutability guard ──────────────────────────────────────────────────────────
-- Once a voucher is REDEEMED, the audit fields and the status are frozen. This is
-- the database-level enforcement of "user_id and redemption_timestamp are
-- immutable" — even a future code path (or a direct SQL UPDATE) can't rewrite the
-- record of who released the cash, when, and to whom.
CREATE OR REPLACE FUNCTION public.cash_voucher_redeemed_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'REDEEMED' THEN
    IF NEW.status IS DISTINCT FROM 'REDEEMED' THEN
      RAISE EXCEPTION 'A redeemed voucher cannot change status' USING errcode = '23514';
    END IF;
    IF NEW.claimed_by              IS DISTINCT FROM OLD.claimed_by
       OR NEW.claimed_at           IS DISTINCT FROM OLD.claimed_at
       OR NEW.redeemed_recipient_name IS DISTINCT FROM OLD.redeemed_recipient_name THEN
      RAISE EXCEPTION 'Redemption audit fields are immutable once a voucher is REDEEMED'
        USING errcode = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cash_voucher_redeemed_immutable_trigger ON public.cash_voucher;
CREATE TRIGGER cash_voucher_redeemed_immutable_trigger
  BEFORE UPDATE ON public.cash_voucher
  FOR EACH ROW EXECUTE FUNCTION public.cash_voucher_redeemed_immutable();

-- 4. create_cash_voucher: new vouchers start ACTIVE ──────────────────────────────
-- Same signature as 0006 (CREATE OR REPLACE) — only the status literal + event
-- label change to the new vocabulary.
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
    v_code, p_amount, 'ACTIVE', btrim(p_recipient_name), p_recipient_email,
    v_uid, v_email, p_payment_method, p_payment_reference
  )
  RETURNING * INTO v_row;

  PERFORM public.log_transaction_event(
    NULL, v_row.id, 'ACTIVE', 'client', v_uid, 'Voucher purchased',
    jsonb_build_object(
      'amount', p_amount,
      'payment_method', p_payment_method,
      'payment_reference', p_payment_reference
    )
  );

  RETURN v_row;

EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_row
    FROM public.cash_voucher
    WHERE payment_reference = p_payment_reference
    LIMIT 1;
    RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cash_voucher(numeric, text, text, text, text) TO authenticated;

-- 5. redeem_cash_voucher: the Back-Office Redeem API ─────────────────────────────
-- Replaces claim_cash_voucher(text). Records the redeemer's name in addition to
-- the staff user_id + timestamp the old function already captured.
DROP FUNCTION IF EXISTS public.claim_cash_voucher(text);

CREATE OR REPLACE FUNCTION public.redeem_cash_voucher(
  p_code          text,
  p_redeemer_name text
)
RETURNS public.cash_voucher
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_current public.cash_voucher;
  v_row     public.cash_voucher;
BEGIN
  IF NOT (public.is_admin() OR public.is_staff()) THEN
    RAISE EXCEPTION 'Only staff can redeem vouchers' USING errcode = '42501';
  END IF;

  IF p_redeemer_name IS NULL OR length(btrim(p_redeemer_name)) = 0 THEN
    RAISE EXCEPTION 'The name of the person exchanging the voucher is required'
      USING errcode = '22023';
  END IF;

  -- Look the voucher up first so we can return a precise reason if it isn't
  -- redeemable (not found / already redeemed / cancelled / expired).
  SELECT * INTO v_current FROM public.cash_voucher WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher % was not found', p_code USING errcode = 'P0002';
  END IF;
  IF v_current.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Voucher is % and cannot be redeemed', v_current.status
      USING errcode = '22023';
  END IF;

  -- Guarded transition: the WHERE status = 'ACTIVE' makes a double-redeem
  -- impossible even under concurrent staff (only one UPDATE can match).
  UPDATE public.cash_voucher
  SET status                  = 'REDEEMED',
      claimed_at              = now(),
      claimed_by              = v_uid,
      redeemed_recipient_name = btrim(p_redeemer_name)
  WHERE code = p_code AND status = 'ACTIVE'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher was just redeemed by someone else' USING errcode = '40001';
  END IF;

  PERFORM public.log_transaction_event(
    NULL, v_row.id, 'REDEEMED', 'staff', v_uid, 'Redeemed in-store',
    jsonb_build_object('redeemer_name', btrim(p_redeemer_name))
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_cash_voucher(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_cash_voucher(text, text) TO authenticated;
