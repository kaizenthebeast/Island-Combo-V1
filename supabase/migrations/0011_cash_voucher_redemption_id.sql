-- ─────────────────────────────────────────────────────────────────────────────
-- Generate Id API (Web App).
--
-- Mints a cryptographically-unique UUID for redemption and stores it on the
-- voucher record. This is the dedicated redemption identifier the spec calls for
-- — distinct from the human-readable `code` (CV-YYYY-…). The UUID is generated
-- SERVER-SIDE by gen_random_uuid() (CSPRNG-backed) so a client can never set or
-- guess it, and a partial UNIQUE index guarantees it is unique across all rows.
--
-- generate_cash_voucher_redemption_id():
--   • authenticated, scoped to the voucher's owner (or staff/admin),
--   • only mints an id while the voucher is ACTIVE,
--   • idempotent — if an id was already minted it returns the same row, so a
--     re-call never invalidates an already-distributed redemption id / QR.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.cash_voucher
  ADD COLUMN IF NOT EXISTS redemption_uuid uuid;

CREATE UNIQUE INDEX IF NOT EXISTS cash_voucher_redemption_uuid_key
  ON public.cash_voucher (redemption_uuid)
  WHERE redemption_uuid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_cash_voucher_redemption_id(
  p_voucher_id uuid
)
RETURNS public.cash_voucher
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_current public.cash_voucher;
  v_uuid    uuid;
  v_row     public.cash_voucher;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  SELECT * INTO v_current FROM public.cash_voucher WHERE id = p_voucher_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found' USING errcode = 'P0002';
  END IF;

  -- The buyer may mint an id for their own voucher; staff/admin may do it for any.
  IF v_current.purchaser_id <> v_uid AND NOT (public.is_admin() OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not allowed to generate a redemption id for this voucher'
      USING errcode = '42501';
  END IF;

  -- Idempotent: never re-issue (and so never invalidate a distributed id).
  IF v_current.redemption_uuid IS NOT NULL THEN
    RETURN v_current;
  END IF;

  IF v_current.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'A redemption id can only be generated for an ACTIVE voucher (status is %)',
      v_current.status USING errcode = '22023';
  END IF;

  -- Cryptographically-random, unique id (gen_random_uuid is CSPRNG-backed).
  LOOP
    v_uuid := gen_random_uuid();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.cash_voucher WHERE redemption_uuid = v_uuid
    );
  END LOOP;

  UPDATE public.cash_voucher
  SET redemption_uuid = v_uuid
  WHERE id = p_voucher_id
  RETURNING * INTO v_row;

  PERFORM public.log_transaction_event(
    NULL, v_row.id, v_row.status, 'client', v_uid, 'Redemption id generated',
    jsonb_build_object('redemption_uuid', v_uuid)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_cash_voucher_redemption_id(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_cash_voucher_redemption_id(uuid) TO authenticated;
