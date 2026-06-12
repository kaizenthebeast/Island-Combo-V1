-- 0055: Block account deletion while the user still has open orders.
--
-- Enterprise rule: an account cannot be hard-deleted while it has orders in
-- flight — any status other than 'completed' / 'cancelled', which includes
-- 'delivered' (still inside the return/refund window until staff mark it
-- 'completed'). Deactivation (softDeleteUser → profile.is_active = false) is
-- the right tool while orders are open.
--
-- Enforced at the database as the authoritative, race-safe gate, on BOTH
-- delete doors:
--   * auth.users     — Supabase dashboard / GoTrue admin API / SQL
--   * public.profile — the admin app's hard delete (deletes the profile row)
-- The app layer additionally pre-checks for a friendly 409
-- (features/users/api/users.ts deleteUser).
--
-- SECURITY DEFINER + pinned search_path: the deleting role (e.g.
-- supabase_auth_admin via the dashboard) has no grants on public.orders, and
-- this project strips default grants, so the check runs with owner rights.

create or replace function public.guard_user_delete_open_orders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_open integer;
begin
  -- auth.users keys the user as `id`; public.profile keys it as `user_id`.
  v_user := (to_jsonb(old) ->> (case when tg_table_schema = 'auth' then 'id' else 'user_id' end))::uuid;

  select count(*) into v_open
  from public.orders o
  where o.user_id = v_user
    and (o.order_status is null or o.order_status not in ('completed', 'cancelled'));

  if v_open > 0 then
    raise exception 'Cannot delete this account: % open order(s) (status not completed/cancelled).', v_open
      using errcode = 'P0001',
            hint = 'Complete or cancel the orders first, or deactivate the account instead.';
  end if;

  return old;
end;
$$;

-- Fires with definer rights from the triggers below; never called by clients.
revoke execute on function public.guard_user_delete_open_orders() from public, anon, authenticated;

drop trigger if exists guard_user_delete_open_orders on auth.users;
create trigger guard_user_delete_open_orders
  before delete on auth.users
  for each row execute function public.guard_user_delete_open_orders();

drop trigger if exists guard_profile_delete_open_orders on public.profile;
create trigger guard_profile_delete_open_orders
  before delete on public.profile
  for each row execute function public.guard_user_delete_open_orders();
