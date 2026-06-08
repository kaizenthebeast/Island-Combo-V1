-- ─────────────────────────────────────────────────────────────────────────────
-- Security Audit Log (admin-only).
--
-- A single append-only `audit_logs` table records security-relevant events across
-- the platform: order lifecycle, product/inventory edits, profile & role changes,
-- payment events, and any admin action. It mirrors the existing transaction_event
-- design (0006): rows are written ONLY by trusted server-side code so they can't
-- be forged —
--   • DB triggers (audit_table_change) capture row changes on the critical tables;
--     they run as the table owner and bypass RLS.
--   • log_audit_event() is a SECURITY DEFINER RPC for app-level events (login,
--     manual admin actions). It is admin/staff-gated and stamps the real actor.
--
-- NOTE: this codebase has no service-role client in the Next app — every
-- privileged write goes through a SECURITY DEFINER function (same as
-- log_transaction_event). That definer path IS the "service-role only" insert
-- channel the spec calls for: there is no INSERT policy and no INSERT grant, so
-- ordinary authenticated/anon clients can never write here directly.
--
-- Reads are admin-only via RLS. Idempotent / safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid,                      -- who did it; NULL = system / unauthenticated
  actor_email text,
  action      text NOT NULL,             -- e.g. 'order.status_changed', 'user.role_changed'
  entity_type text NOT NULL,             -- 'user' | 'order' | 'product' | 'payment' | 'admin'
  entity_id   text,                      -- PK of the affected row (text — PKs differ per table)
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  metadata    jsonb
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx  ON public.audit_logs (entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx   ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx  ON public.audit_logs (action);

-- 2. Append-only guard: no UPDATE / DELETE, ever ──────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_logs_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (no % allowed)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_mutate ON public.audit_logs;
CREATE TRIGGER audit_logs_no_mutate
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_append_only();

-- 3. RLS: only admins may read; nobody may write directly ──────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
-- No INSERT/UPDATE/DELETE policies and no INSERT grant: only the SECURITY DEFINER
-- triggers/RPC below write here (they run as the owner and bypass RLS).

GRANT SELECT ON public.audit_logs TO authenticated;

-- 4. App-level logger — SECURITY DEFINER, admin/staff-gated ────────────────────
-- Used by lib/audit.ts insertAuditLog() for events that have no table trigger
-- (logins, CSV exports, explicit admin actions). Stamps the verified caller.
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action      text,
  p_entity_type text,
  p_entity_id   text  DEFAULT NULL,
  p_old_data    jsonb DEFAULT NULL,
  p_new_data    jsonb DEFAULT NULL,
  p_ip_address  text  DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_row   public.audit_logs;
BEGIN
  -- Only privileged callers may write app-level audit rows. (Table triggers run
  -- as the owner and never reach this function.)
  IF NOT (public.is_admin() OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not authorized to write audit logs' USING errcode = '42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, entity_type, entity_id, old_data, new_data, ip_address, metadata
  )
  VALUES (
    v_uid, v_email, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data, p_ip_address, p_metadata
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Callable only by signed-in (authenticated) users; the body still enforces
-- admin/staff. Revoke the implicit PUBLIC/anon execute so anon can't reach it.
REVOKE ALL ON FUNCTION public.log_audit_event(text, text, text, jsonb, jsonb, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb, jsonb, text, jsonb) TO authenticated;

-- 5. Table-change trigger — captures row changes on the critical tables ────────
-- Generic across tables: derives entity_type / action / entity_id from the source
-- table and operation. EXCEPTION-safe so auditing can NEVER break the real write.
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entity_type text;
  v_entity_id   text;
  v_action      text;
  v_old         jsonb;
  v_new         jsonb;
  v_actor       uuid := auth.uid();
  v_actor_email text;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'orders'           THEN 'order'
    WHEN 'products'         THEN 'product'
    WHEN 'product_variants' THEN 'product'
    WHEN 'profile'          THEN 'user'
    WHEN 'payments'         THEN 'payment'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSE
    v_old := to_jsonb(OLD);
  END IF;

  -- Entity id = the affected row's PK (column differs per table).
  v_entity_id := CASE TG_TABLE_NAME
    WHEN 'orders'           THEN coalesce(v_new->>'order_id',   v_old->>'order_id')
    WHEN 'products'         THEN coalesce(v_new->>'product_id', v_old->>'product_id')
    WHEN 'product_variants' THEN coalesce(v_new->>'variant_id', v_old->>'variant_id')
    WHEN 'profile'          THEN coalesce(v_new->>'user_id',    v_old->>'user_id')
    WHEN 'payments'         THEN coalesce(v_new->>'order_id',   v_old->>'order_id')
    ELSE NULL
  END;

  -- Action: default by op, then refine on the fields that matter per table.
  v_action := v_entity_type || CASE TG_OP
    WHEN 'INSERT' THEN '.created'
    WHEN 'UPDATE' THEN '.updated'
    ELSE '.deleted'
  END;

  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'orders' AND (v_old->>'order_status') IS DISTINCT FROM (v_new->>'order_status') THEN
      v_action := 'order.status_changed';
    ELSIF TG_TABLE_NAME = 'profile' AND (v_old->>'role') IS DISTINCT FROM (v_new->>'role') THEN
      v_action := 'user.role_changed';
    ELSIF TG_TABLE_NAME = 'product_variants' AND (v_old->>'stock') IS DISTINCT FROM (v_new->>'stock') THEN
      v_action := 'product.stock_changed';
    ELSIF TG_TABLE_NAME = 'product_variants' AND (v_old->>'price') IS DISTINCT FROM (v_new->>'price') THEN
      v_action := 'product.price_changed';
    ELSIF TG_TABLE_NAME = 'payments' AND (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
      v_action := 'payment.status_changed';
    END IF;
  END IF;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, entity_type, entity_id, old_data, new_data, metadata
  )
  VALUES (
    v_actor, v_actor_email, v_action, v_entity_type, v_entity_id, v_old, v_new,
    jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP)
  );

  RETURN NULL;  -- AFTER trigger: return value is ignored.
EXCEPTION
  WHEN OTHERS THEN
    -- Auditing must never abort the underlying write.
    RETURN NULL;
END;
$$;

-- Internal use only: fired by triggers, never called directly by clients.
REVOKE ALL ON FUNCTION public.audit_table_change() FROM public, anon, authenticated;

-- 6. Attach the trigger to the critical tables ────────────────────────────────
DROP TRIGGER IF EXISTS orders_audit           ON public.orders;
CREATE TRIGGER orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS products_audit         ON public.products;
CREATE TRIGGER products_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS product_variants_audit ON public.product_variants;
CREATE TRIGGER product_variants_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS profile_audit          ON public.profile;
CREATE TRIGGER profile_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profile
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS payments_audit         ON public.payments;
CREATE TRIGGER payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();
