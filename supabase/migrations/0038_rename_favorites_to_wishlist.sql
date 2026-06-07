-- ─────────────────────────────────────────────────────────────────────────────
-- Rename favorites → wishlist (terminology consistency with the spec/docs).
-- Table + view + policies + the prune function. RLS/grants follow the table
-- rename automatically; the view is dropped & recreated (security_invoker kept).
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW public.favorites_view;

ALTER TABLE public.favorites RENAME TO wishlist;

-- keep policy names consistent with the new table name
ALTER POLICY favorites_select ON public.wishlist RENAME TO wishlist_select;
ALTER POLICY favorites_insert ON public.wishlist RENAME TO wishlist_insert;
ALTER POLICY favorites_update ON public.wishlist RENAME TO wishlist_update;
ALTER POLICY favorites_delete ON public.wishlist RENAME TO wishlist_delete;

CREATE VIEW public.wishlist_view WITH (security_invoker = on) AS
 SELECT f.id AS wishlist_id,
    f.user_id,
    f.created_at AS wishlisted_at,
    p.product_id,
    p.name AS product_name,
    p.description,
    p.slug,
    p.discount,
    p.type,
    p.status = 'ACTIVE'::product_status AS is_active,
        CASE
            WHEN c.category_id IS NOT NULL THEN jsonb_build_object('category_id', c.category_id, 'name', c.name)
            ELSE NULL::jsonb
        END AS category,
    ( SELECT pi.image_path
           FROM product_variants pv2
             JOIN product_images pi ON pi.variant_id = pv2.variant_id
          WHERE pv2.product_id = p.product_id AND pv2.is_active = true AND pi.is_primary = true
          ORDER BY pv2.price
         LIMIT 1) AS primary_image,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('variant_id', v.variant_id, 'sku', v.sku, 'price', v.price, 'final_price', round(v.price * (1::numeric - COALESCE(p.discount, 0::numeric) / 100::numeric), 2), 'stock', v.stock, 'pricing_tiers', COALESCE(( SELECT jsonb_agg(jsonb_build_object('label', pt.label, 'min_quantity', pt.min_quantity, 'discount_percent', pt.discount_percent, 'computed_price', round(v.price * (1::numeric - pt.discount_percent / 100::numeric), 2)) ORDER BY pt.min_quantity) AS jsonb_agg
                   FROM variant_pricing_tiers pt
                  WHERE pt.variant_id = v.variant_id AND pt.is_active = true), '[]'::jsonb), 'image_url', COALESCE(( SELECT jsonb_agg(img.image_path ORDER BY img.sort_order, img.id) AS jsonb_agg
                   FROM product_images img
                  WHERE img.variant_id = v.variant_id), '[]'::jsonb), 'attributes', COALESCE(( SELECT jsonb_agg(jsonb_build_object('name', va.attribute_name, 'value', va.attribute_value)) AS jsonb_agg
                   FROM variant_attributes va
                  WHERE va.variant_id = v.variant_id), '[]'::jsonb)) ORDER BY v.price, v.variant_id) AS jsonb_agg
           FROM product_variants v
          WHERE v.product_id = p.product_id AND v.is_active = true), '[]'::jsonb) AS variants
   FROM wishlist f
     JOIN products p ON p.product_id = f.product_id
     LEFT JOIN category c ON c.category_id = p.category_id;

GRANT SELECT ON public.wishlist_view TO authenticated;

-- prune_abandoned_guests cleaned up the favorites table; point it at wishlist.
CREATE OR REPLACE FUNCTION public.prune_abandoned_guests(p_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  DELETE FROM public.cart        WHERE user_id = ANY(v_ids);
  DELETE FROM public.cart_meta   WHERE user_id = ANY(v_ids);
  DELETE FROM public.wishlist    WHERE user_id = ANY(v_ids);
  DELETE FROM public.profile_pts WHERE user_id = ANY(v_ids);
  DELETE FROM public.profile     WHERE user_id = ANY(v_ids);

  WITH del AS (DELETE FROM auth.users WHERE id = ANY(v_ids) RETURNING id)
  SELECT count(*) INTO v_count FROM del;

  RETURN v_count;
END;
$function$;
