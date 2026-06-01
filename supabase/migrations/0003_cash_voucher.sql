-- ─────────────────────────────────────────────────────────────────────────────
-- Cash Voucher: a prepaid "cash" product a customer buys online and a recipient
-- claims in-store (QR + valid ID). This is unrelated to public.promo, which is
-- the discount/promo-code system.
--
-- Security model:
--   • The voucher `code` (what the QR encodes) is generated SERVER-SIDE only, by
--     create_cash_voucher(). Clients can never set the code, amount, or status.
--   • No raw card data is ever stored — only the processor's payment_reference.
--   • RLS: a buyer sees only their own vouchers; staff/admin see all. Creating and
--     claiming happen exclusively through SECURITY DEFINER functions, so there are
--     no client INSERT/UPDATE policies at all.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_voucher (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  code              text NOT NULL,
  amount            numeric NOT NULL CHECK (amount > 0),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status = ANY (ARRAY['pending'::text, 'claimed'::text, 'cancelled'::text, 'expired'::text])),
  recipient_name    text NOT NULL,
  recipient_email   text,
  -- Person who paid for the voucher.
  purchaser_id      uuid NOT NULL DEFAULT auth.uid(),
  payment_method    text,
  -- Processor charge/transaction id. NEVER a card number (PCI scope).
  payment_reference text,
  claimed_at        timestamp with time zone,
  claimed_by        uuid,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  updated_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cash_voucher_pkey PRIMARY KEY (id),
  CONSTRAINT cash_voucher_code_key UNIQUE (code),
  CONSTRAINT cash_voucher_purchaser_id_fkey FOREIGN KEY (purchaser_id) REFERENCES auth.users(id),
  CONSTRAINT cash_voucher_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS cash_voucher_purchaser_id_idx ON public.cash_voucher (purchaser_id);
CREATE INDEX IF NOT EXISTS cash_voucher_status_idx ON public.cash_voucher (status);

-- 2. updated_at trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cash_voucher_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cash_voucher_set_updated_at_trigger ON public.cash_voucher;
CREATE TRIGGER cash_voucher_set_updated_at_trigger
  BEFORE UPDATE ON public.cash_voucher
  FOR EACH ROW EXECUTE FUNCTION public.cash_voucher_set_updated_at();


-- 4. Row-Level Security ──────────────────────────────────────────────────────────
ALTER TABLE public.cash_voucher ENABLE ROW LEVEL SECURITY;

-- Read: buyer sees their own; staff/admin see everything.
DROP POLICY IF EXISTS cash_voucher_select_own_or_staff ON public.cash_voucher;
CREATE POLICY cash_voucher_select_own_or_staff
  ON public.cash_voucher
  FOR SELECT
  TO authenticated
  USING (purchaser_id = auth.uid() OR public.is_admin() OR public.is_staff()) ;

-- No INSERT/UPDATE/DELETE policies on purpose: all writes go through the
-- SECURITY DEFINER functions below, which bypass RLS and enforce the rules.

-- 5. CREATE (server-side, generates the code) ────────────────────────────────────
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
  v_uid  uuid := auth.uid();
  v_code text;
  v_row  public.cash_voucher;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero' USING errcode = '22023';
  END IF;

  IF p_recipient_name IS NULL OR length(btrim(p_recipient_name)) = 0 THEN
    RAISE EXCEPTION 'Recipient name is required' USING errcode = '22023';
  END IF;

  -- Cryptographically-random, unique code. gen_random_uuid() is CSPRNG-backed.
  LOOP
    v_code := 'CV-' || to_char(now() AT TIME ZONE 'utc', 'YYYY') || '-'
              || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cash_voucher WHERE code = v_code);
  END LOOP;

  INSERT INTO public.cash_voucher (
    code, amount, status, recipient_name, recipient_email,
    purchaser_id, payment_method, payment_reference
  )
  VALUES (
    v_code, p_amount, 'pending', btrim(p_recipient_name), p_recipient_email,
    v_uid, p_payment_method, p_payment_reference
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 6. CLAIM (staff/admin only) ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_cash_voucher(p_code text)
RETURNS public.cash_voucher
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.cash_voucher;
BEGIN
  IF NOT (public.is_admin() OR public.is_staff()) THEN
    RAISE EXCEPTION 'Only staff can claim vouchers' USING errcode = '42501';
  END IF;

  UPDATE public.cash_voucher
  SET status = 'claimed', claimed_at = now(), claimed_by = auth.uid()
  WHERE code = p_code AND status = 'pending'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found or not claimable' USING errcode = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

-- 7. Grants ───────────────────────────────────────────────────────────────────────
-- Buyers may be anonymously-signed-in users; they still carry the `authenticated`
-- role, so granting to `authenticated` is sufficient (no `anon` grants needed).
REVOKE ALL ON FUNCTION public.create_cash_voucher(numeric, text, text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.claim_cash_voucher(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_cash_voucher(numeric, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_cash_voucher(text) TO authenticated;
