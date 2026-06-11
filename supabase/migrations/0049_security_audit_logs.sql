-- ─────────────────────────────────────────────────────────────────────────────
-- Security Audit Log (admin-only, append-only).
--
-- Records security-relevant events that originate from UNAUTHENTICATED or any
-- caller: API rate-limit hits and failed login attempts. Unlike audit_logs
-- (whose log_audit_event RPC is admin/staff-gated), the writer here is callable
-- by anon, because a failed login / rate-limit hit has no trusted session.
--
-- Writes go ONLY through the SECURITY DEFINER log_security_event() RPC — there is
-- no INSERT policy or grant, and UPDATE/DELETE are blocked by trigger, so the
-- table is immutable from every client. user_id is resolved server-side so the
-- caller can never forge attribution. Reads are admin-only via RLS. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table ────────────────────────────────────────────────────────────────────
create table if not exists public.security_audit_logs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  event_type  text not null check (event_type in ('rate_limit_exceeded','login_failed')),
  user_id     uuid,            -- resolved server-side; NULL if the account is unknown
  email       text,            -- attempted / known email
  ip_address  text,
  user_agent  text,
  route       text,            -- endpoint involved
  details     jsonb
);

create index if not exists security_audit_created_idx on public.security_audit_logs (created_at desc);
create index if not exists security_audit_event_idx   on public.security_audit_logs (event_type, created_at desc);
create index if not exists security_audit_user_idx    on public.security_audit_logs (user_id, created_at desc);
create index if not exists security_audit_email_idx   on public.security_audit_logs (email);

-- 2. Append-only guard: no UPDATE / DELETE, ever ──────────────────────────────
create or replace function public.security_audit_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'security_audit_logs is append-only (no % allowed)', tg_op;
end;
$$;

drop trigger if exists security_audit_no_mutate on public.security_audit_logs;
create trigger security_audit_no_mutate
  before update or delete on public.security_audit_logs
  for each row execute function public.security_audit_append_only();

-- 3. RLS: only admins may read; nobody may write directly ──────────────────────
alter table public.security_audit_logs enable row level security;

drop policy if exists security_audit_select on public.security_audit_logs;
create policy security_audit_select
  on public.security_audit_logs
  for select
  to authenticated
  using (public.is_admin());

grant select on public.security_audit_logs to authenticated;
-- No INSERT/UPDATE/DELETE policy or grant: only the definer RPC below writes here.

-- 4. Writer — SECURITY DEFINER, callable by anon ──────────────────────────────
-- A failed login / rate-limit hit has no trusted session, so anon must be able to
-- call this. user_id is resolved INSIDE the function (never taken from the caller):
--   • login_failed       → the targeted account, looked up by email
--   • rate_limit_exceeded → the authenticated caller (auth.uid()), if any
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
    -- Rate limit: the authenticated caller, if any.
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

-- Anon MUST be able to log (unauthenticated failed logins). The function resolves
-- user_id itself, so anon access cannot be abused to forge attribution.
revoke all on function public.log_security_event(text, text, text, text, text, jsonb) from public;
grant execute on function public.log_security_event(text, text, text, text, text, jsonb) to anon, authenticated;
