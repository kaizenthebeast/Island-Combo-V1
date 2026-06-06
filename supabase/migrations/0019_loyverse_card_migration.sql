-- ─────────────────────────────────────────────────────────────────────────────
-- Loyverse loyalty-card migration (§3.8)
--
-- Admins bulk-import the store's existing (already-generated) loyalty cards and
-- their accumulated point balances into a staging table. Existing customers then
-- CLAIM their card from the web app ("Retrieve my points") — which atomically
-- credits the migrated balance, links the card to their profile, and marks the
-- card claimed so it can never be claimed twice. No live Loyverse API needed.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loyverse_card (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_number   text NOT NULL UNIQUE,        -- the code the customer enters
  points        integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  customer_name text,
  email         text,
  claimed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyverse_card ENABLE ROW LEVEL SECURITY;

-- Admin-only direct access (import + the migration list). Customers never read
-- this table directly — they claim through the SECURITY DEFINER RPC below.
DROP POLICY IF EXISTS loyverse_card_admin_select ON public.loyverse_card;
CREATE POLICY loyverse_card_admin_select ON public.loyverse_card
  FOR SELECT USING ((SELECT public.is_admin()));
DROP POLICY IF EXISTS loyverse_card_admin_insert ON public.loyverse_card;
CREATE POLICY loyverse_card_admin_insert ON public.loyverse_card
  FOR INSERT WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS loyverse_card_admin_update ON public.loyverse_card;
CREATE POLICY loyverse_card_admin_update ON public.loyverse_card
  FOR UPDATE USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS loyverse_card_admin_delete ON public.loyverse_card;
CREATE POLICY loyverse_card_admin_delete ON public.loyverse_card
  FOR DELETE USING ((SELECT public.is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyverse_card TO authenticated;

-- Claim: a member redeems their legacy card. Atomic + cross-table (reads another
-- staging row, credits points, links the profile, marks claimed) → SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.claim_loyverse_card(p_card_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_anon     boolean := COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_card     public.loyverse_card;
  v_existing text;
BEGIN
  IF v_uid IS NULL OR v_anon THEN
    RAISE EXCEPTION 'You must be signed in to claim a loyalty card' USING errcode = '28000';
  END IF;
  IF p_card_number IS NULL OR length(btrim(p_card_number)) = 0 THEN
    RAISE EXCEPTION 'A loyalty card number is required' USING errcode = '22023';
  END IF;

  -- One legacy card per member.
  SELECT loyverse_customer_code INTO v_existing FROM public.profile WHERE user_id = v_uid;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You have already linked a loyalty card' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_card FROM public.loyverse_card
  WHERE card_number = btrim(p_card_number)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No loyalty card found with that number' USING errcode = 'P0002';
  END IF;
  IF v_card.claimed_by IS NOT NULL THEN
    RAISE EXCEPTION 'This loyalty card has already been claimed' USING errcode = 'P0001';
  END IF;

  -- Credit the migrated balance (one-off; the card is marked claimed below).
  IF v_card.points > 0 THEN
    INSERT INTO public.profile_pts_transaction_records (user_id, points, reason)
    VALUES (v_uid, v_card.points, 'loyverse_import');

    UPDATE public.profile_pts SET total_pts = total_pts + v_card.points WHERE user_id = v_uid;
    IF NOT FOUND THEN
      INSERT INTO public.profile_pts (user_id, total_pts) VALUES (v_uid, v_card.points);
    END IF;
  END IF;

  -- Link the card to the member + mark it claimed.
  UPDATE public.profile
  SET loyverse_customer_code = v_card.card_number, loyalty_card_linked_at = now()
  WHERE user_id = v_uid;

  UPDATE public.loyverse_card SET claimed_by = v_uid, claimed_at = now() WHERE id = v_card.id;

  RETURN jsonb_build_object('points', v_card.points, 'card_number', v_card.card_number);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_loyverse_card(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_loyverse_card(text) TO authenticated;
