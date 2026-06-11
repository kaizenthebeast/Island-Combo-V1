-- ─────────────────────────────────────────────────────────────────────────────
-- Tighten security-audit writes to the service role only.
--
-- 0049 made log_security_event() anon-callable because the app had no
-- service-role client. It now has one (SUPABASE_SECRET_KEY → createAdminClient),
-- so the anon surface is unnecessary: a holder of the publishable key could spam
-- junk security rows via /rest/v1/rpc/log_security_event. Re-scope:
--   • EXECUTE revoked from public/anon/authenticated; granted to service_role.
--   • The function now accepts an explicit p_user_id — safe, because only our
--     trusted server code can call it; the cart route passes the VERIFIED
--     session user. login_failed still resolves the account by email lookup.
--   • auth.uid() branch removed (service-role calls carry no user JWT).
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.log_security_event(text, text, text, text, text, jsonb);

create or replace function public.log_security_event(
  p_event_type text,
  p_user_id    uuid  default null,
  p_email      text  default null,
  p_ip_address text  default null,
  p_user_agent text  default null,
  p_route      text  default null,
  p_details    jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := p_user_id;
  v_email text := nullif(btrim(p_email), '');
begin
  if p_event_type not in ('rate_limit_exceeded','login_failed') then
    raise exception 'Unknown security event type: %', p_event_type using errcode = '22023';
  end if;

  -- login_failed: attribute to the targeted account by email when the caller
  -- doesn't know the id (the login route never does).
  if v_uid is null and v_email is not null then
    select id into v_uid from auth.users where lower(email) = lower(v_email) limit 1;
  end if;

  -- Backfill the email from the id when only the id is known (rate limits).
  if v_email is null and v_uid is not null then
    select email into v_email from auth.users where id = v_uid;
  end if;

  insert into public.security_audit_logs (
    event_type, user_id, email, ip_address, user_agent, route, details
  )
  values (
    p_event_type, v_uid, v_email,
    nullif(btrim(p_ip_address), ''), p_user_agent, p_route, p_details
  );
end;
$$;

-- Service-role only: no client key (anon or authenticated) may execute.
revoke all on function public.log_security_event(text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_security_event(text, uuid, text, text, text, text, jsonb) to service_role;
