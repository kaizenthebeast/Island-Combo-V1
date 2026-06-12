-- 0058: audit coverage for loyalty points and product categories.
--
-- Extends the staff-only audit trail (0057) to two more entities:
--   • profile_pts — staff-driven point movements log 'loyalty.points_changed'
--     (admin manual adjustments, accruals fired by staff marking orders
--     delivered, refund restitutions). Customer checkout earn/redeem and the
--     Loyverse sync (actor NULL) stay excluded by the staff-actor filter.
--     entity_id = the customer whose balance changed.
--   • category — staff category CRUD logs category.created/.updated/.deleted.

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
    WHEN 'profile_pts'      THEN 'loyalty'
    WHEN 'category'         THEN 'category'
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
  -- the human-facing code; loyalty rows point at the customer whose balance moved.
  v_entity_id := CASE TG_TABLE_NAME
    WHEN 'orders'           THEN coalesce(v_new->>'order_id',     v_old->>'order_id')
    WHEN 'products'         THEN coalesce(v_new->>'product_id',   v_old->>'product_id')
    WHEN 'product_variants' THEN coalesce(v_new->>'variant_id',   v_old->>'variant_id')
    WHEN 'profile'          THEN coalesce(v_new->>'user_id',      v_old->>'user_id')
    WHEN 'payments'         THEN coalesce(v_new->>'order_id',     v_old->>'order_id')
    WHEN 'cash_voucher'     THEN coalesce(v_new->>'code',         v_old->>'code')
    WHEN 'profile_pts'      THEN coalesce(v_new->>'user_id',      v_old->>'user_id')
    WHEN 'category'         THEN coalesce(v_new->>'category_id',  v_old->>'category_id')
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
    ELSIF TG_TABLE_NAME = 'profile_pts' AND (v_old->>'total_pts') IS DISTINCT FROM (v_new->>'total_pts') THEN
      v_action := 'loyalty.points_changed';
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

-- profile_pts: UPDATE only — INSERT is signup provisioning (customer/system
-- actor, filtered anyway) and DELETE is the user-deletion cascade, already
-- logged as user.deleted by the profile trigger.
DROP TRIGGER IF EXISTS profile_pts_audit ON public.profile_pts;
CREATE TRIGGER profile_pts_audit
  AFTER UPDATE ON public.profile_pts
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS category_audit ON public.category;
CREATE TRIGGER category_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.category
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();
