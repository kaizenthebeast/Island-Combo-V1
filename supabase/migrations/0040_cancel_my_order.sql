-- ─────────────────────────────────────────────────────────────────────────────
-- Customer self-cancel for an order that hasn't shipped yet (pending/paid).
-- Reverses what create_order did: restores stock (+ ledger), refunds redeemed
-- points, and reverses any accrued points. For a card order it flags the event
-- as refund-pending (the actual money refund is a staff/PayPal step).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_my_order(p_order_id bigint)
 RETURNS public.orders
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
  v_accrued   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  SELECT * INTO v_order FROM public.orders
   WHERE order_id = p_order_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING errcode = 'P0002';
  END IF;
  IF v_order.order_status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'This order can no longer be cancelled' USING errcode = '22023';
  END IF;

  -- Restore stock for every line + ledger the reversal.
  FOR v_item IN SELECT variant_id, quantity FROM public.order_items WHERE order_id = p_order_id
  LOOP
    UPDATE public.product_variants
      SET stock = stock + v_item.quantity, updated_at = now()
    WHERE variant_id = v_item.variant_id
    RETURNING stock INTO v_new_stock;

    INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, order_id, actor)
    VALUES (v_item.variant_id, v_item.quantity, v_new_stock, 'cancellation', p_order_id, v_uid);
  END LOOP;

  -- Refund points that were redeemed on this order.
  SELECT coalesce(-sum(points), 0) INTO v_redeemed
  FROM public.profile_pts_transaction_records
  WHERE order_id = p_order_id AND reason = 'Order redeem';
  IF v_redeemed > 0 THEN
    UPDATE public.profile_pts SET total_pts = total_pts + v_redeemed WHERE user_id = v_uid;
    INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
    VALUES (v_uid, p_order_id, v_redeemed, 'Order redeem reversal');
  END IF;

  -- Reverse points accrued on this order (clamp the balance at zero).
  SELECT coalesce(sum(points), 0) INTO v_accrued
  FROM public.profile_pts_transaction_records
  WHERE order_id = p_order_id AND reason = 'Order earn';
  IF v_accrued > 0 THEN
    UPDATE public.profile_pts SET total_pts = greatest(0, total_pts - v_accrued) WHERE user_id = v_uid;
    INSERT INTO public.profile_pts_transaction_records (user_id, order_id, points, reason)
    VALUES (v_uid, p_order_id, -v_accrued, 'Order earn reversal');
  END IF;

  UPDATE public.orders SET order_status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id RETURNING * INTO v_order;

  PERFORM public.log_transaction_event(
    p_order_id, NULL, 'cancelled', 'client', v_uid,
    CASE WHEN v_order.payment_method = 'card'
         THEN 'Cancelled by customer — refund pending'
         ELSE 'Cancelled by customer' END,
    jsonb_build_object('refund_required', v_order.payment_method = 'card')
  );

  RETURN v_order;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_my_order(bigint) TO authenticated;
