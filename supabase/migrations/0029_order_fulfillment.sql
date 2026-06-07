-- ─────────────────────────────────────────────────────────────────────────────
-- #4  Shipment / tracking for an order (1:1 with orders).
--
-- orders carried a shipping address + fee but had nowhere to record carrier,
-- tracking number, or ship/deliver timestamps (there's an unimplemented
-- OrderTracking UI placeholder). Staff write it via lib/admin/orders
-- (setOrderTracking, a plain guarded upsert — no RPC needed); the buyer can read
-- their own. Customer-facing tracking UI is out of scope here.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.order_fulfillment (
  order_id        bigint PRIMARY KEY REFERENCES public.orders(order_id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'unfulfilled'
                    CHECK (status IN ('unfulfilled','processing','shipped','out_for_delivery','delivered','returned','cancelled')),
  carrier         text,
  tracking_number text,
  tracking_url    text,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_fulfillment ENABLE ROW LEVEL SECURITY;

-- Reads: the order's owner or any staff (mirrors orders_select).
CREATE POLICY order_fulfillment_select ON public.order_fulfillment FOR SELECT TO authenticated
USING (
  (SELECT public.is_staff())
  OR EXISTS (SELECT 1 FROM public.orders o
             WHERE o.order_id = order_fulfillment.order_id
               AND o.user_id = (SELECT auth.uid()))
);
-- Only staff write fulfillment.
CREATE POLICY order_fulfillment_insert ON public.order_fulfillment FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_staff()));
CREATE POLICY order_fulfillment_update ON public.order_fulfillment FOR UPDATE TO authenticated
  USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));
CREATE POLICY order_fulfillment_delete ON public.order_fulfillment FOR DELETE TO authenticated
  USING ((SELECT public.is_staff()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_fulfillment TO authenticated;

-- Keep updated_at fresh on every change (reuses the shared trigger fn).
CREATE TRIGGER order_fulfillment_set_updated_at
  BEFORE UPDATE ON public.order_fulfillment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
