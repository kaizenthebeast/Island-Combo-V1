-- ─────────────────────────────────────────────────────────────────────────────
-- Cart-level discount & loyalty-point redemption (spec §3.3 / §3.9)
--
-- The `cart` table is line-items only. The spec refers to "the cart record" that
-- holds an applied promo code and a points redemption, recalculated by Fetch
-- Cart. We model that header with `cart_meta` (one row per user/guest).
--
-- Design note: the validation + persistence for apply/remove discount and points
-- is plain reads plus a single owner-scoped write, so it lives in server-side
-- TypeScript (lib/cart/*) rather than RPCs. RLS below lets a user read AND write
-- only its own header. The one genuinely complex operation — merge_cart — stays
-- an RPC: it is atomic and must touch the *guest's* rows (a different user_id),
-- which RLS would block from the app layer, so it runs SECURITY DEFINER.
--
-- Loyalty rules live in lib/cart/loyalty-config.ts (100 pts = $1, min 100 pts,
-- max = cart subtotal). Points are held as a reservation: total_pts is only
-- debited at checkout; available = total_pts − points_redeemed.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Cart header ("the cart record") ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_meta (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code      text,
  points_redeemed integer NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_meta ENABLE ROW LEVEL SECURITY;

-- Owner-only: a user reads and writes its own cart header. Server-side TS runs
-- as the user, so these policies are what authorize the apply/remove writes.
DROP POLICY IF EXISTS cart_meta_select_own ON public.cart_meta;
CREATE POLICY cart_meta_select_own ON public.cart_meta
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS cart_meta_insert_own ON public.cart_meta;
CREATE POLICY cart_meta_insert_own ON public.cart_meta
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS cart_meta_update_own ON public.cart_meta;
CREATE POLICY cart_meta_update_own ON public.cart_meta
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS cart_meta_delete_own ON public.cart_meta;
CREATE POLICY cart_meta_delete_own ON public.cart_meta
  FOR DELETE USING (auth.uid() = user_id);

-- 2) Promo usage limits (§3.3 "usage limits") ───────────────────────────────
ALTER TABLE public.promo
  ADD COLUMN IF NOT EXISTS max_uses   integer CHECK (max_uses IS NULL OR max_uses >= 0),
  ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0);

-- 3) Cart Merge v2 — prioritise the USER's saved quantities, drop duplicates ──
-- §3.3: "merges the contents of the Guest Cart into the User Cart, prioritizing
-- the user's saved quantities and deleting duplicate line items." The earlier
-- version SUMMED quantities; this keeps the user's line for any duplicate and
-- only carries over guest-only lines. The guest cart + header are then deleted.
CREATE OR REPLACE FUNCTION public.merge_cart(p_guest_user_id uuid, p_auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_guest_user_id = p_auth_user_id THEN RETURN; END IF;
  IF auth.uid() <> p_auth_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot merge into another user''s cart';
  END IF;

  -- Carry over only guest lines the user does NOT already have (user qty wins).
  INSERT INTO public.cart (user_id, variant_id, quantity, selected_option, created_at)
  SELECT p_auth_user_id, g.variant_id, g.quantity, g.selected_option, now()
  FROM public.cart g
  WHERE g.user_id = p_guest_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.cart u
      WHERE u.user_id = p_auth_user_id
        AND u.variant_id = g.variant_id
        AND u.selected_option IS NOT DISTINCT FROM g.selected_option
    );

  DELETE FROM public.cart WHERE user_id = p_guest_user_id;

  -- Carry over the guest's applied promo only if the user has no header yet.
  -- (Guests are anonymous and cannot redeem points, so points_redeemed = 0.)
  INSERT INTO public.cart_meta (user_id, promo_code, updated_at)
  SELECT p_auth_user_id, gm.promo_code, now()
  FROM public.cart_meta gm
  WHERE gm.user_id = p_guest_user_id
  ON CONFLICT (user_id) DO NOTHING;

  DELETE FROM public.cart_meta WHERE user_id = p_guest_user_id;
END;
$$;
