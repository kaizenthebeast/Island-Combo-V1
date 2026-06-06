-- ─────────────────────────────────────────────────────────────────────────────
-- Abandoned-guest cleanup (pg_cron — NOT an edge function)
--
-- Pruning DB rows belongs IN the database: pg_cron + a SQL function runs in-process
-- (no network hop, no extra service) and is the right tool. Edge functions are for
-- reaching OUTSIDE Postgres (Loyverse API, PayPal webhook).
--
-- Deletes anonymous (guest) sessions older than N days that never became real
-- customers — no orders, vouchers, or reviews. Their cart/cart_meta/profile_pts/
-- profile/favorites are cleared first (those FKs are NO ACTION, not CASCADE), then
-- the auth user is removed. Guests who placed an order (or have a voucher/review)
-- are always kept.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prune_abandoned_guests(p_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids   uuid[];
  v_count integer;
BEGIN
  SELECT array_agg(u.id) INTO v_ids
  FROM auth.users u
  WHERE u.is_anonymous = true
    AND u.created_at < now() - make_interval(days => p_days)
    AND NOT EXISTS (SELECT 1 FROM public.orders o        WHERE o.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.cash_voucher cv WHERE cv.purchaser_id = u.id OR cv.claimed_by = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.reviews r       WHERE r.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.review_votes rv WHERE rv.user_id = u.id);

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  -- Clear the non-cascading dependents first.
  DELETE FROM public.cart        WHERE user_id = ANY(v_ids);
  DELETE FROM public.cart_meta   WHERE user_id = ANY(v_ids);
  DELETE FROM public.favorites   WHERE user_id = ANY(v_ids);
  DELETE FROM public.profile_pts WHERE user_id = ANY(v_ids);
  DELETE FROM public.profile     WHERE user_id = ANY(v_ids);

  WITH del AS (DELETE FROM auth.users WHERE id = ANY(v_ids) RETURNING id)
  SELECT count(*) INTO v_count FROM del;

  RETURN v_count;
END;
$$;

-- Maintenance function — only the scheduler/owner runs it.
REVOKE ALL ON FUNCTION public.prune_abandoned_guests(integer) FROM public, anon, authenticated;

-- Schedule: daily at 03:00 UTC. cron.schedule upserts by job name (idempotent).
SELECT cron.schedule('prune-abandoned-guests', '0 3 * * *', $$ SELECT public.prune_abandoned_guests(30); $$);
