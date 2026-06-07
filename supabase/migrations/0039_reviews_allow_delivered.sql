-- Customers can rate an item once it's received — allow reviews on 'delivered'
-- OR 'completed' (was 'completed' only). Updates the eligibility view + insert RLS.

CREATE OR REPLACE VIEW public.reviewable_products WITH (security_invoker = on) AS
SELECT DISTINCT
  o.user_id,
  o.order_id,
  p.product_id,
  p.name      AS product_name,
  p.slug,
  o.created_at AS ordered_at
FROM public.orders o
JOIN public.order_items     oi ON oi.order_id   = o.order_id
JOIN public.product_variants pv ON pv.variant_id = oi.variant_id
JOIN public.products         p  ON p.product_id  = pv.product_id
WHERE o.order_status IN ('delivered', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.user_id = o.user_id
      AND r.order_id = o.order_id
      AND r.product_id = p.product_id
  );

DROP POLICY IF EXISTS reviews_insert ON public.reviews;
CREATE POLICY reviews_insert ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.is_admin())
  OR (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.order_items     oi ON oi.order_id   = o.order_id
      JOIN public.product_variants pv ON pv.variant_id = oi.variant_id
      WHERE o.order_id = reviews.order_id
        AND o.user_id = (SELECT auth.uid())
        AND o.order_status IN ('delivered', 'completed')
        AND pv.product_id = reviews.product_id
    )
  )
);
