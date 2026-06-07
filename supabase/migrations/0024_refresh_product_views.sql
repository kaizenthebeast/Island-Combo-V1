-- ─────────────────────────────────────────────────────────────────────────────
-- Recreate the matview-refresh function the `refresh-product-views` cron calls.
--
-- The cron (cron.job → public.refresh_product_views()) had been FAILING on every
-- run ("function public.refresh_product_views() does not exist"), so neither
-- materialized view was being refreshed — storefront product listings and the
-- admin user directory were silently going stale.
--
-- Both matviews carry a UNIQUE index (product_catalog_mv → product_id,
-- admin_user_mv → user_id), so REFRESH ... CONCURRENTLY is valid and avoids
-- read-locking the views while they rebuild.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.refresh_product_views()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  refresh materialized view concurrently public.product_catalog_mv;
  refresh materialized view concurrently public.admin_user_mv;
end;
$$;

-- Cron (runs as the job owner) is the only intended caller; keep it off the API roles.
revoke all on function public.refresh_product_views() from public;
revoke all on function public.refresh_product_views() from anon;
revoke all on function public.refresh_product_views() from authenticated;
