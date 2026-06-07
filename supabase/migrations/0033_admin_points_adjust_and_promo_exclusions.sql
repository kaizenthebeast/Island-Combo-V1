-- ─────────────────────────────────────────────────────────────────────────────
-- §2.5 Admin Adjust Loyalty Points + §2.6 Promotion Exclusion Management.
-- ─────────────────────────────────────────────────────────────────────────────

-- (1) Ledger gains an `actor` so manual admin adjustments record WHO made them.
--     Accrual/redeem rows leave it null (system/self); admin adjustments set it.
ALTER TABLE public.profile_pts_transaction_records
  ADD COLUMN IF NOT EXISTS actor uuid;

-- (2) Admin Adjust Loyalty Points — manual +/- with a required reason, written to
--     the ledger with the admin's id. Balance-locked; never goes negative.
CREATE OR REPLACE FUNCTION public.admin_adjust_points(
  p_user_id uuid, p_delta integer, p_reason text)
 RETURNS public.profile_pts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_admin   uuid := auth.uid();
  v_balance integer;
  v_row     public.profile_pts;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A customer is required' USING errcode = '22023';
  END IF;
  IF coalesce(p_delta, 0) = 0 THEN
    RAISE EXCEPTION 'Adjustment must be non-zero' USING errcode = '22023';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required' USING errcode = '22023';
  END IF;

  SELECT total_pts INTO v_balance FROM public.profile_pts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.profile_pts (user_id, total_pts) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_balance := 0;
  END IF;

  IF v_balance + p_delta < 0 THEN
    RAISE EXCEPTION 'Adjustment would make the balance negative (have %, change %)', v_balance, p_delta
      USING errcode = '22023';
  END IF;

  UPDATE public.profile_pts SET total_pts = total_pts + p_delta
  WHERE user_id = p_user_id RETURNING * INTO v_row;

  INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason, actor)
  VALUES (p_user_id, NULL, p_delta, btrim(p_reason), v_admin);

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_points(uuid, integer, text) TO authenticated;

-- (3) Promotion Exclusion list — products/categories protected from ALL promo
--     discounts (generalizes the existing cart-level digital-product rule). Each
--     row targets exactly one product OR one category.
CREATE TABLE public.promo_exclusion (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id  bigint REFERENCES public.products(product_id) ON DELETE CASCADE,
  category_id bigint REFERENCES public.category(category_id) ON DELETE CASCADE,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_exclusion_one_target CHECK (num_nonnulls(product_id, category_id) = 1)
);
CREATE UNIQUE INDEX promo_exclusion_product_uidx  ON public.promo_exclusion (product_id)  WHERE product_id  IS NOT NULL;
CREATE UNIQUE INDEX promo_exclusion_category_uidx ON public.promo_exclusion (category_id) WHERE category_id IS NOT NULL;

ALTER TABLE public.promo_exclusion ENABLE ROW LEVEL SECURITY;

-- Readable by everyone (it's just "which products can't be discounted"); cart
-- promo validation reads it. Writes are admin-only.
CREATE POLICY promo_exclusion_select ON public.promo_exclusion FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY promo_exclusion_insert ON public.promo_exclusion FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY promo_exclusion_delete ON public.promo_exclusion FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

GRANT SELECT ON public.promo_exclusion TO anon, authenticated;
GRANT INSERT, DELETE ON public.promo_exclusion TO authenticated;
