-- admin_user_mv (the customer directory the admin Users/Customers page reads) was
-- missing a SELECT grant for the API role, so getUsersPage failed with
-- "permission denied for table admin_user_mv". Grant it, matching admin_staff_mv.
-- NOTE: materialized views can't carry RLS, so this exposes the matview to any
-- authenticated role at the DB level — the requireAdmin guard only protects the
-- route, not a direct client query. Follow-up: wrap both admin matviews in
-- is_admin-guarded RPCs to close that gap.
GRANT SELECT ON public.admin_user_mv TO authenticated;
