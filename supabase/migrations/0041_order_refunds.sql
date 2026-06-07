-- ─────────────────────────────────────────────────────────────────────────────
-- Order cancellation → refund workflow.
--   • Unpaid orders cancel immediately (no money moved).
--   • Paid (PayPal-captured) orders create a refunds REQUEST that staff validate
--     in the admin Refunds tab before anything is cancelled/refunded.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.refunds (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id          bigint NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  amount            numeric NOT NULL DEFAULT 0,
  reason            text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','refunded','rejected')),
  paypal_capture_id text,
  paypal_refund_id  text,
  staff_note        text,
  requested_by      uuid,
  requested_at      timestamptz NOT NULL DEFAULT now(),
  processed_by      uuid,
  processed_at      timestamptz
);
CREATE INDEX refunds_order_id_idx ON public.refunds (order_id);
CREATE INDEX refunds_status_idx   ON public.refunds (status);
CREATE UNIQUE INDEX refunds_one_pending_per_order ON public.refunds (order_id) WHERE status = 'pending';

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY refunds_select ON public.refunds FOR SELECT TO authenticated
USING (
  (SELECT public.is_staff())
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = refunds.order_id AND o.user_id = (SELECT auth.uid()))
);
CREATE POLICY refunds_insert ON public.refunds FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_staff()));
CREATE POLICY refunds_update ON public.refunds FOR UPDATE TO authenticated USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));
GRANT SELECT, INSERT, UPDATE ON public.refunds TO authenticated;

-- ── cancel_my_order: reason required; paid orders raise a refund request ──────
DROP FUNCTION IF EXISTS public.cancel_my_order(bigint);
CREATE OR REPLACE FUNCTION public.cancel_my_order(p_order_id bigint, p_reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_order     public.orders;
  v_item      record;
  v_new_stock integer;
  v_redeemed  integer;
  v_reason    text := btrim(coalesce(p_reason, ''));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '28000'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'A cancellation reason is required' USING errcode = '22023'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE order_id = p_order_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING errcode = 'P0002'; END IF;
  IF v_order.order_status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'This order can no longer be cancelled' USING errcode = '22023';
  END IF;

  -- Paid (money captured) → staff must validate the refund first; just request it.
  IF v_order.paypal_capture_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.refunds WHERE order_id = p_order_id AND status = 'pending') THEN
      RAISE EXCEPTION 'A refund request is already pending for this order' USING errcode = '22023';
    END IF;
    INSERT INTO public.refunds (order_id, amount, reason, paypal_capture_id, requested_by)
    VALUES (p_order_id, coalesce(v_order.total_amount, 0), v_reason, v_order.paypal_capture_id, v_uid);
    PERFORM public.log_transaction_event(
      p_order_id, NULL, v_order.order_status, 'client', v_uid,
      'Cancellation & refund requested: ' || v_reason,
      jsonb_build_object('refund_requested', true, 'reason', v_reason));
    RETURN jsonb_build_object('order_status', v_order.order_status, 'refund_requested', true);
  END IF;

  -- Unpaid → cancel immediately (restore stock + redeemed points; no accrual yet).
  FOR v_item IN SELECT variant_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
    UPDATE public.product_variants SET stock = stock + v_item.quantity, updated_at = now()
    WHERE variant_id = v_item.variant_id RETURNING stock INTO v_new_stock;
    INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, order_id, actor)
    VALUES (v_item.variant_id, v_item.quantity, v_new_stock, 'cancellation', p_order_id, v_uid);
  END LOOP;

  SELECT coalesce(-sum(points), 0) INTO v_redeemed
  FROM public.profile_pts_transaction_records WHERE order_id = p_order_id AND reason = 'Order redeem';
  IF v_redeemed > 0 THEN
    UPDATE public.profile_pts SET total_pts = total_pts + v_redeemed WHERE user_id = v_uid;
    INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
    VALUES (v_uid, p_order_id, v_redeemed, 'Order redeem reversal');
  END IF;

  UPDATE public.orders SET order_status = 'cancelled', updated_at = now() WHERE order_id = p_order_id;
  PERFORM public.log_transaction_event(
    p_order_id, NULL, 'cancelled', 'client', v_uid, 'Cancelled by customer: ' || v_reason,
    jsonb_build_object('reason', v_reason));
  RETURN jsonb_build_object('order_status', 'cancelled', 'refund_requested', false);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(bigint, text) TO authenticated;

-- ── process_order_refund: staff approve (cancel + restore + mark refunded) / reject ──
CREATE OR REPLACE FUNCTION public.process_order_refund(
  p_refund_id bigint, p_action text, p_paypal_refund_id text DEFAULT NULL, p_note text DEFAULT NULL)
 RETURNS public.refunds
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_staff     uuid := auth.uid();
  v_refund    public.refunds;
  v_order     public.orders;
  v_item      record;
  v_new_stock integer;
  v_redeemed  integer;
  v_accrued   integer;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not authorized' USING errcode = '42501'; END IF;
  IF p_action NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'Invalid action' USING errcode = '22023'; END IF;

  SELECT * INTO v_refund FROM public.refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found' USING errcode = 'P0002'; END IF;
  IF v_refund.status <> 'pending' THEN RAISE EXCEPTION 'This refund has already been processed' USING errcode = '22023'; END IF;

  IF p_action = 'reject' THEN
    UPDATE public.refunds SET status = 'rejected', processed_by = v_staff, processed_at = now(), staff_note = p_note
    WHERE id = p_refund_id RETURNING * INTO v_refund;
    PERFORM public.log_transaction_event(v_refund.order_id, NULL, NULL, 'staff', v_staff,
      'Refund request rejected', jsonb_build_object('refund_id', p_refund_id, 'note', p_note));
    RETURN v_refund;
  END IF;

  -- approve → cancel the order, restore stock + points, mark refunded.
  SELECT * INTO v_order FROM public.orders WHERE order_id = v_refund.order_id FOR UPDATE;

  FOR v_item IN SELECT variant_id, quantity FROM public.order_items WHERE order_id = v_order.order_id LOOP
    UPDATE public.product_variants SET stock = stock + v_item.quantity, updated_at = now()
    WHERE variant_id = v_item.variant_id RETURNING stock INTO v_new_stock;
    INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, order_id, actor)
    VALUES (v_item.variant_id, v_item.quantity, v_new_stock, 'cancellation', v_order.order_id, v_staff);
  END LOOP;

  SELECT coalesce(-sum(points), 0) INTO v_redeemed
  FROM public.profile_pts_transaction_records WHERE order_id = v_order.order_id AND reason = 'Order redeem';
  IF v_redeemed > 0 THEN
    UPDATE public.profile_pts SET total_pts = total_pts + v_redeemed WHERE user_id = v_order.user_id;
    INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
    VALUES (v_order.user_id, v_order.order_id, v_redeemed, 'Order redeem reversal');
  END IF;

  SELECT coalesce(sum(points), 0) INTO v_accrued
  FROM public.profile_pts_transaction_records WHERE order_id = v_order.order_id AND reason = 'Order earn';
  IF v_accrued > 0 THEN
    UPDATE public.profile_pts SET total_pts = greatest(0, total_pts - v_accrued) WHERE user_id = v_order.user_id;
    INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
    VALUES (v_order.user_id, v_order.order_id, -v_accrued, 'Order earn reversal');
  END IF;

  UPDATE public.orders SET order_status = 'cancelled', updated_at = now() WHERE order_id = v_order.order_id;
  UPDATE public.refunds SET status = 'refunded', processed_by = v_staff, processed_at = now(),
    paypal_refund_id = p_paypal_refund_id, staff_note = p_note
  WHERE id = p_refund_id RETURNING * INTO v_refund;

  PERFORM public.log_transaction_event(v_order.order_id, NULL, 'cancelled', 'staff', v_staff,
    'Refund approved & order cancelled',
    jsonb_build_object('refund_id', p_refund_id, 'paypal_refund_id', p_paypal_refund_id, 'note', p_note));
  RETURN v_refund;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.process_order_refund(bigint, text, text, text) TO authenticated;
