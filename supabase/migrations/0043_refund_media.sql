-- ─────────────────────────────────────────────────────────────────────────────
-- Refund/return evidence: a PRIVATE storage bucket (unlike public review media,
-- refund proof is sensitive) + the customer's attached files on the request.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'refund-media', 'refund-media', false, 52428800,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif',
        'video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Read: the uploader (own folder) OR staff (to review the request). Private bucket
-- → access is via signed URLs only.
CREATE POLICY "refund_media_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'refund-media'
    AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR (SELECT public.is_staff()))
  );
CREATE POLICY "refund_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'refund-media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "refund_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'refund-media'
    AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR (SELECT public.is_staff()))
  );

-- Attached evidence paths on the refund request.
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS media_paths text[] NOT NULL DEFAULT '{}';

-- cancel_my_order now accepts the uploaded evidence (stored on the paid-order
-- refund request). Body otherwise matches 0041.
DROP FUNCTION IF EXISTS public.cancel_my_order(bigint, text);
CREATE OR REPLACE FUNCTION public.cancel_my_order(
  p_order_id bigint, p_reason text DEFAULT NULL, p_media text[] DEFAULT '{}')
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

  IF v_order.paypal_capture_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.refunds WHERE order_id = p_order_id AND status = 'pending') THEN
      RAISE EXCEPTION 'A refund request is already pending for this order' USING errcode = '22023';
    END IF;
    INSERT INTO public.refunds (order_id, amount, reason, paypal_capture_id, requested_by, media_paths)
    VALUES (p_order_id, coalesce(v_order.total_amount, 0), v_reason, v_order.paypal_capture_id, v_uid, coalesce(p_media, '{}'));
    PERFORM public.log_transaction_event(
      p_order_id, NULL, v_order.order_status, 'client', v_uid,
      'Cancellation & refund requested: ' || v_reason,
      jsonb_build_object('refund_requested', true, 'reason', v_reason, 'media_count', coalesce(array_length(p_media, 1), 0)));
    RETURN jsonb_build_object('order_status', v_order.order_status, 'refund_requested', true);
  END IF;

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
GRANT EXECUTE ON FUNCTION public.cancel_my_order(bigint, text, text[]) TO authenticated;
