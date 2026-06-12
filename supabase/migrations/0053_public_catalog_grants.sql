-- ─────────────────────────────────────────────────────────────────────────────
-- Missing table grants for public storefront reads + admin banner CRUD.
--
-- RLS already encodes the intended access (banners_public_read /
-- *_public_read SELECT policies for {anon, authenticated}; banner writes gated
-- by is_admin()), but Postgres checks TABLE privileges before RLS, and these
-- were never granted (same class of gap as 0016):
--   • banners had NO acl at all → "permission denied" for everyone, including
--     the admin CRUD which writes directly under RLS.
--   • product_details / product_images / product_variants / variant_attributes /
--     variant_pricing_tiers had authenticated=SELECT but no anon grant → fresh
--     visitors (SSR before the anonymous session cookie exists) were denied.
--     `products` itself already had anon SELECT — these mirror it.
--
-- Row scoping stays in RLS: non-admins only see ACTIVE in-window banners;
-- catalog rows per the public_read policies; banner writes admin-only.
-- ─────────────────────────────────────────────────────────────────────────────

grant select on public.banners to anon, authenticated;
-- Admin CRUD writes directly (features/banners/api/admin); RLS is_admin() gates rows.
grant insert, update, delete on public.banners to authenticated;

grant select on public.product_details       to anon;
grant select on public.product_images        to anon;
grant select on public.product_variants      to anon;
grant select on public.variant_attributes    to anon;
grant select on public.variant_pricing_tiers to anon;
