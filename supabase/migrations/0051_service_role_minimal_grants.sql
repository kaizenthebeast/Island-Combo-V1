-- ─────────────────────────────────────────────────────────────────────────────
-- Minimal service_role grants for the app's two service-key features.
--
-- This project's hardening stripped service_role's USAGE on schema public, so
-- the secret-key client (shared/lib/db/admin.ts) could not reach ANY public
-- object via PostgREST — breaking:
--   1. security-event logging (rpc log_security_event, service_role-only)
--   2. staff/admin invite provisioning (profile insert at invite time)
--
-- Restore the bare minimum instead of Supabase's default service_role=ALL:
-- schema USAGE plus per-object grants. log_security_event runs SECURITY DEFINER
-- (owner postgres), so no table grant on security_audit_logs is needed — the
-- table stays unreachable even for service_role except through the RPC.
-- ─────────────────────────────────────────────────────────────────────────────

grant usage on schema public to service_role;

-- Invite provisioning: insert the profile row with the invited role; select for
-- supabase-js's `.insert()` returning representation; delete is NOT granted —
-- rollback of a failed invite removes the auth user (FK cascade handles profile).
grant select, insert on public.profile to service_role;
