-- 0057: audit_logs records BACK-OFFICE actions only + captures voucher redemption.
--
-- The audit trail answers "which staff/admin did what": voucher redemptions,
-- order status changes, stock/price/product edits, user & role edits, exports.
-- Two kinds of writes are therefore NO LONGER recorded here:
--   • customer self-service (checkout inserts, own-profile edits, voucher
--     purchases) — actor exists but is not staff/admin;
--   • system/webhook writes (actor NULL — e.g. PayPal webhook payment updates,
--     service-role provisioning).
-- System activity already has dedicated ledgers (transaction_event,
-- stock_movements, payments); audit_logs is the staff-accountability trail.
--
-- Also extends coverage to cash_voucher: staff redemptions log
-- 'voucher.redeemed' (other staff status changes log 'voucher.status_changed').

-- 1. Filtered + voucher-aware audit trigger function ──────────────────────────
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
  -- Staff-accountability log: only active staff/admin actors are recorded.
  -- Customer self-service and system/webhook writes (actor NULL) are skipped.
  IF v_actor IS NULL OR NOT public.is_staff() THEN
    RETURN NULL;
  END IF;

  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'orders'           THEN 'order'
    WHEN 'products'         THEN 'product'
    WHEN 'product_variants' THEN 'product'
    WHEN 'profile'          THEN 'user'
    WHEN 'payments'         THEN 'payment'
    WHEN 'cash_voucher'     THEN 'voucher'
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

  -- Entity id = the affected row's PK (column differs per table). Vouchers use
  -- the human-facing code — that is what staff search by.
  v_entity_id := CASE TG_TABLE_NAME
    WHEN 'orders'           THEN coalesce(v_new->>'order_id',   v_old->>'order_id')
    WHEN 'products'         THEN coalesce(v_new->>'product_id', v_old->>'product_id')
    WHEN 'product_variants' THEN coalesce(v_new->>'variant_id', v_old->>'variant_id')
    WHEN 'profile'          THEN coalesce(v_new->>'user_id',    v_old->>'user_id')
    WHEN 'payments'         THEN coalesce(v_new->>'order_id',   v_old->>'order_id')
    WHEN 'cash_voucher'     THEN coalesce(v_new->>'code',       v_old->>'code')
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
    ELSIF TG_TABLE_NAME = 'cash_voucher' AND (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
      v_action := CASE
        WHEN v_new->>'status' = 'REDEEMED' THEN 'voucher.redeemed'
        ELSE 'voucher.status_changed'
      END;
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

-- 2. Capture voucher redemptions / staff status changes ───────────────────────
-- UPDATE/DELETE only: voucher INSERTs are customer purchases, which the actor
-- filter would skip anyway — no point firing the trigger on every sale.
DROP TRIGGER IF EXISTS cash_voucher_audit ON public.cash_voucher;
CREATE TRIGGER cash_voucher_audit
  AFTER UPDATE OR DELETE ON public.cash_voucher
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();
