-- ─────────────────────────────────────────────────────────────────────────────
-- Cash voucher schema cleanup + redemption-id wiring.
--
--   • DROP `order_id`: added in 0010 as an "optional link to an order", but the
--     voucher buy-now flow never creates an orders row — vouchers and orders are
--     unified only at the view level (order_overview, 0034). The column was NULL
--     on every row and nothing (app code, views, RPCs) ever read or wrote it.
--
--   • Wire up `redemption_uuid` (0011): until now the Generate Id API minted it
--     but the whole redemption pipeline looked vouchers up by the display `code`
--     only. redeem_cash_voucher() now resolves a voucher by EITHER identifier:
--       - the dedicated redemption id (canonical UUID, what new QRs encode), or
--       - the human-readable code (CV-YYYY-…, typed at the counter and what
--         QRs issued before this migration encode — those must keep working).
--     Code shapes never collide: a voucher code is 'CV-…', never UUID-shaped.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the dead order_id column ────────────────────────────────────────────
ALTER TABLE public.cash_voucher DROP CONSTRAINT IF EXISTS cash_voucher_order_id_fkey;
ALTER TABLE public.cash_voucher DROP COLUMN IF EXISTS order_id;

-- 2. redeem_cash_voucher: accept code OR redemption UUID ──────────────────────
-- Same signature as 0010 (CREATE OR REPLACE) — only the voucher lookup changes,
-- plus the guarded UPDATE now keys on id (works for both lookup paths).
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
  v_input   text := btrim(p_code);
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

  -- Resolve by redemption UUID (what new QRs encode) or by display code
  -- (typed at the counter / legacy QRs). The shapes are disjoint.
  IF v_input ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_current FROM public.cash_voucher WHERE redemption_uuid = v_input::uuid;
  ELSE
    SELECT * INTO v_current FROM public.cash_voucher WHERE code = upper(v_input);
  END IF;

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
  WHERE id = v_current.id AND status = 'ACTIVE'
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
