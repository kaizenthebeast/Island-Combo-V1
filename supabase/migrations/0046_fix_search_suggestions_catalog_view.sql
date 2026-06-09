-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: storefront search returned no products.
--
-- search_product_suggestions joined public.product_catalog_mv, but that
-- materialized view was replaced by the plain view public.product_catalog. The
-- dropped relation made every search raise 42P01 ("relation does not exist"),
-- so the /api/search/suggestions route threw and the UI showed nothing.
--
-- This was NOT a permission/RLS problem: anon & authenticated both have SELECT
-- on products (policy products_public_read covers status='ACTIVE'), and EXECUTE
-- on this function. Only the relation reference was stale.
--
-- Repoint the join to product_catalog (same columns). SECURITY INVOKER is kept:
-- the base table products is still read for search_vector under its public_read
-- RLS policy, and product_catalog is a SECURITY DEFINER view anon may select.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_product_suggestions(p_query text, p_limit integer DEFAULT 8)
 RETURNS TABLE(product_id bigint, name text, slug text, image_url text, base_price numeric, final_price numeric, discount numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_query   tsquery;
  v_cleaned text;
BEGIN
  v_cleaned := trim(coalesce(p_query, ''));
  IF v_cleaned = '' THEN
    RETURN;
  END IF;

  BEGIN
    SELECT to_tsquery('simple', string_agg(lex || ':*', ' & '))
    INTO v_query
    FROM (
      SELECT regexp_replace(lower(w), '[^a-z0-9]', '', 'g') AS lex
      FROM regexp_split_to_table(v_cleaned, '\s+') AS w
    ) t
    WHERE lex <> '';
  EXCEPTION WHEN OTHERS THEN
    v_query := NULL;
  END;

  IF v_query IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.product_id,
    pc.name,
    pc.slug,
    pc.image_url,
    pc.base_price,
    pc.final_price,
    pc.discount
  FROM public.products p
  JOIN public.product_catalog pc ON pc.product_id = p.product_id
  WHERE p.search_vector @@ v_query
    AND p.status = 'ACTIVE'
  ORDER BY ts_rank_cd(p.search_vector, v_query) DESC,
           pc.name ASC
  LIMIT GREATEST(LEAST(p_limit, 20), 1);
END;
$function$;

GRANT SELECT ON public.product_catalog TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_product_suggestions(text, integer) TO anon, authenticated;
