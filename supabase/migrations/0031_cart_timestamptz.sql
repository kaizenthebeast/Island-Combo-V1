-- ─────────────────────────────────────────────────────────────────────────────
-- #5a  cart.created_at / updated_at were `timestamp without time zone` while every
-- other table uses timestamptz — a latent UTC-anchoring bug. Existing values were
-- written by now() (UTC), so reinterpret them AT TIME ZONE 'UTC'.
--
-- cart_view depends on created_at, so it's dropped and recreated verbatim around
-- the ALTER. The security_invoker=on option is preserved (the view must keep
-- enforcing the querying user's RLS on cart, not the owner's).
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW public.cart_view;

ALTER TABLE public.cart
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

CREATE VIEW public.cart_view WITH (security_invoker=on) AS
 SELECT c.id,
    c.user_id,
    c.variant_id,
    c.quantity,
    c.selected_option,
    c.created_at,
    p.product_id,
    p.name,
    p.slug,
    p.description,
    p.discount,
    v.sku,
    v.price,
    v.stock,
    v.is_active,
    pi.image_path AS image_url,
    round(v.price * (1::numeric - COALESCE(p.discount, 0::numeric) / 100.0), 2) AS final_price,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('label', pt.label, 'min_quantity', pt.min_quantity, 'discount_percent', pt.discount_percent, 'computed_price', round(v.price * (1::numeric - pt.discount_percent / 100.0), 2)) ORDER BY pt.min_quantity) AS jsonb_agg
           FROM variant_pricing_tiers pt
          WHERE pt.variant_id = c.variant_id AND pt.is_active = true), '[]'::jsonb) AS pricing_tiers,
    ( SELECT pt.label
           FROM variant_pricing_tiers pt
          WHERE pt.variant_id = c.variant_id AND pt.is_active = true AND pt.min_quantity <= c.quantity
          ORDER BY pt.min_quantity DESC
         LIMIT 1) AS applied_tier_label,
    round(v.price * (1::numeric - COALESCE(( SELECT pt.discount_percent
           FROM variant_pricing_tiers pt
          WHERE pt.variant_id = c.variant_id AND pt.is_active = true AND pt.min_quantity <= c.quantity
          ORDER BY pt.min_quantity DESC
         LIMIT 1), 0::numeric) / 100.0), 2) AS applied_price,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('name', va.attribute_name, 'value', va.attribute_value)) AS jsonb_agg
           FROM variant_attributes va
          WHERE va.variant_id = c.variant_id), '[]'::jsonb) AS attributes
   FROM cart c
     JOIN product_variants v ON v.variant_id = c.variant_id
     JOIN products p ON p.product_id = v.product_id
     LEFT JOIN variant_primary_image pi ON pi.variant_id = v.variant_id;

GRANT SELECT ON public.cart_view TO authenticated;
