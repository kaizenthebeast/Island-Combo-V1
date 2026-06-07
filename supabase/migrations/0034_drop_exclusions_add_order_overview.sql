-- ─────────────────────────────────────────────────────────────────────────────
-- Cash vouchers have their own buy-now flow (their own table, paid immediately),
-- so the promo Exclusion list and the cart's digital-product gating are
-- unnecessary complexity. Drop the exclusion table, and instead expose a single
-- read model that unifies physical orders and voucher purchases for the back office.
-- (admin_adjust_points + the ledger `actor` column from 0033 stay — those are the
-- separate, kept §2.5 feature.)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.promo_exclusion;

-- Unified order feed: physical orders ∪ cash-voucher purchases, with a `source`
-- discriminator that doubles as the §2.4 "product type" filter. security_invoker
-- so the querying user's RLS applies (staff see all; a customer sees only their
-- own orders + own vouchers — both base tables already grant SELECT to authenticated).
CREATE VIEW public.order_overview WITH (security_invoker = on) AS
  SELECT
    'product'::text     AS source,
    o.public_ref::text  AS ref,
    o.order_id::text    AS source_id,
    o.user_id           AS customer_id,
    p.email             AS customer_email,
    o.order_status      AS status,
    o.payment_method    AS payment_method,
    o.total_amount      AS amount,
    o.created_at        AS created_at
  FROM public.orders o
  LEFT JOIN public.profile p ON p.user_id = o.user_id
  UNION ALL
  SELECT
    'voucher'::text     AS source,
    cv.code             AS ref,
    cv.id::text         AS source_id,
    cv.purchaser_id     AS customer_id,
    cv.purchaser_email  AS customer_email,
    cv.status           AS status,
    cv.payment_method   AS payment_method,
    cv.amount           AS amount,
    cv.created_at       AS created_at
  FROM public.cash_voucher cv;

GRANT SELECT ON public.order_overview TO authenticated;
