-- ─────────────────────────────────────────────────────────────────────────────
-- Revert log_security_event to the anon-callable design (0049), dropping the
-- app's SUPABASE_SECRET_KEY dependency.
--
-- 0050 scoped the writer to service_role because the Next app briefly held a
-- secret-key client. Direction changed: privileged work moved to Edge Functions
-- (invite-user) and the app should run on the publishable key alone. A failed
-- login has no session, so the writer must be callable by anon again.
--
-- Attribution stays unforgeable: p_user_id is REMOVED — callers can never
-- assert an identity. login_failed resolves the targeted account by email;
-- rate_limit_exceeded uses auth.uid() from the verified JWT of the session
-- client making the call. Accepted tradeoff (as in 0049): a publishable-key
-- holder can insert junk rows; they cannot read, edit, or impersonate —
-- the table stays admin-read, append-only.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.log_security_event(text, uuid, text, text, text, text, jsonb);
drop function if exists public.log_security_event(text, text, text, text, text, jsonb);

create or replace function public.log_security_event(
  p_event_type text,
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
  v_uid   uuid;
  v_email text := nullif(btrim(p_email), '');
begin
  if p_event_type not in ('rate_limit_exceeded','login_failed') then
    raise exception 'Unknown security event type: %', p_event_type using errcode = '22023';
  end if;

  if p_event_type = 'login_failed' then
    -- Attribute to the targeted account (by email), NOT the caller's guest session.
    if v_email is not null then
      select id into v_uid from auth.users where lower(email) = lower(v_email) limit 1;
    end if;
  else
    -- Rate limit: the authenticated caller, from the verified JWT.
    v_uid := auth.uid();
    if v_email is null and v_uid is not null then
      select email into v_email from auth.users where id = v_uid;
    end if;
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

-- Anon MUST be able to log (unauthenticated failed logins). The function
-- resolves user_id itself, so anon access cannot forge attribution.
revoke all on function public.log_security_event(text, text, text, text, text, jsonb) from public;
grant execute on function public.log_security_event(text, text, text, text, text, jsonb) to anon, authenticated;
