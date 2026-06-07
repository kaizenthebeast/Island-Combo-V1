-- One staff-gated read powering the admin analytics dashboard. Aggregates the
-- metrics an ecommerce back office needs: revenue, orders, AOV, customers,
-- status breakdown, a 14-day revenue series, top products, low stock, refunds.
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rev text[] := ARRAY['paid','shipped','out_for_delivery','delivered','completed'];
  v_result jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  SELECT jsonb_build_object(
    'revenue', jsonb_build_object(
      'total',        coalesce((SELECT sum(total_amount) FROM orders WHERE order_status = ANY(v_rev)), 0),
      'last_30_days', coalesce((SELECT sum(total_amount) FROM orders WHERE order_status = ANY(v_rev) AND created_at >= now() - interval '30 days'), 0),
      'today',        coalesce((SELECT sum(total_amount) FROM orders WHERE order_status = ANY(v_rev) AND created_at >= date_trunc('day', now())), 0)
    ),
    'orders', jsonb_build_object(
      'total',               (SELECT count(*) FROM orders),
      'today',               (SELECT count(*) FROM orders WHERE created_at >= date_trunc('day', now())),
      'pending_fulfillment', (SELECT count(*) FROM orders WHERE order_status IN ('paid','shipped','out_for_delivery')),
      'aov',                 coalesce((SELECT avg(total_amount) FROM orders WHERE order_status = ANY(v_rev)), 0)
    ),
    'customers', jsonb_build_object(
      'total',       (SELECT count(*) FROM profile WHERE role = 'customer'),
      'new_30_days', (SELECT count(*) FROM profile WHERE role = 'customer' AND created_at >= now() - interval '30 days')
    ),
    'refunds_pending', (SELECT count(*) FROM refunds WHERE status = 'pending'),
    'by_status', coalesce((
      SELECT jsonb_agg(jsonb_build_object('status', s.status, 'count', s.c) ORDER BY s.c DESC)
      FROM (SELECT order_status AS status, count(*) c FROM orders GROUP BY order_status) s
    ), '[]'::jsonb),
    'revenue_series', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d.day, 'revenue', coalesce(r.rev, 0)) ORDER BY d.day)
      FROM (SELECT generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day')::date AS day) d
      LEFT JOIN (
        SELECT created_at::date AS day, sum(total_amount) rev
        FROM orders WHERE order_status = ANY(v_rev) AND created_at >= now() - interval '14 days'
        GROUP BY created_at::date
      ) r ON r.day = d.day
    ), '[]'::jsonb),
    'top_products', coalesce((
      SELECT jsonb_agg(t) FROM (
        SELECT oi.product_name AS name, sum(oi.quantity)::int AS qty, sum(oi.price * oi.quantity) AS revenue
        FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_status = ANY(v_rev)
        GROUP BY oi.product_name ORDER BY qty DESC LIMIT 5
      ) t
    ), '[]'::jsonb),
    'low_stock', coalesce((
      SELECT jsonb_agg(t) FROM (
        SELECT pv.variant_id, pv.sku, p.name AS product_name, pv.stock
        FROM product_variants pv JOIN products p ON p.product_id = pv.product_id
        WHERE pv.is_active AND pv.stock <= 5
        ORDER BY pv.stock ASC LIMIT 8
      ) t
    ), '[]'::jsonb),
    'vouchers', jsonb_build_object(
      'active',       (SELECT count(*) FROM cash_voucher WHERE status = 'ACTIVE'),
      'active_value', coalesce((SELECT sum(amount) FROM cash_voucher WHERE status = 'ACTIVE'), 0)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
