-- ─────────────────────────────────────────────────────────────────────────────
-- Audit trail (Level 2), shared by ALL purchases — orders and cash vouchers.
--
-- A single append-only `transaction_event` table records every status change as
-- a new row. It links to the parent purchase via real foreign keys: exactly one
-- of (order_id, cash_voucher_id) is set per row. The parent table keeps its own
-- current `status` column (fast reads / RLS); this table is the history.
--
-- Every transition is written through log_transaction_event() inside the same
-- transaction as the status change, so state and history can never drift. That
-- helper is internal (SECURITY DEFINER, not granted to clients) so audit rows
-- can't be forged — only the trusted transition functions write them.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_event (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Exactly one parent is set (see CHECK). Real FKs keep referential integrity.
  order_id        bigint,
  cash_voucher_id uuid,
  -- The status the purchase moved into (vocab differs per type, so not enum'd).
  status          text NOT NULL,
  note            text,
  actor_id        uuid,                       -- who triggered it; NULL = system
  source          text NOT NULL DEFAULT 'system'
                    CHECK (source = ANY (ARRAY['client'::text, 'staff'::text, 'webhook'::text, 'system'::text])),
  metadata        jsonb,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transaction_event_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_event_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT transaction_event_cash_voucher_id_fkey
    FOREIGN KEY (cash_voucher_id) REFERENCES public.cash_voucher(id),
  -- Exclusive arc: a row belongs to an order XOR a cash voucher.
  CONSTRAINT transaction_event_one_parent CHECK (
    (order_id IS NOT NULL AND cash_voucher_id IS NULL)
    OR (order_id IS NULL AND cash_voucher_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS transaction_event_order_idx
  ON public.transaction_event (order_id, created_at) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transaction_event_cash_voucher_idx
  ON public.transaction_event (cash_voucher_id, created_at) WHERE cash_voucher_id IS NOT NULL;

-- 2. Append-only guard: no UPDATE / DELETE, ever ──────────────────────────────
CREATE OR REPLACE FUNCTION public.transaction_event_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'transaction_event is append-only (no % allowed)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS transaction_event_no_mutate ON public.transaction_event;
CREATE TRIGGER transaction_event_no_mutate
  BEFORE UPDATE OR DELETE ON public.transaction_event
  FOR EACH ROW EXECUTE FUNCTION public.transaction_event_append_only();

-- 3. RLS: a buyer sees events for their own purchases; staff/admin see all ─────
ALTER TABLE public.transaction_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_event_select ON public.transaction_event;
CREATE POLICY transaction_event_select
  ON public.transaction_event
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_staff()
    OR (
      cash_voucher_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.cash_voucher v
        WHERE v.id = cash_voucher_id AND v.purchaser_id = auth.uid()
      )
    )
    OR (
      order_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.order_id = transaction_event.order_id AND o.user_id = auth.uid()
      )
    )
  );
-- No INSERT/UPDATE/DELETE policies: only the SECURITY DEFINER transition
-- functions write here (via log_transaction_event).

-- 4. Reusable logger — internal only (clients can't forge audit rows) ──────────
CREATE OR REPLACE FUNCTION public.log_transaction_event(
  p_order_id        bigint,
  p_cash_voucher_id uuid,
  p_status          text,
  p_source          text DEFAULT 'system',
  p_actor_id        uuid DEFAULT NULL,
  p_note            text DEFAULT NULL,
  p_metadata        jsonb DEFAULT NULL
)
RETURNS public.transaction_event
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.transaction_event;
BEGIN
  INSERT INTO public.transaction_event (
    order_id, cash_voucher_id, status, source, actor_id, note, metadata
  )
  VALUES (
    p_order_id, p_cash_voucher_id, p_status, coalesce(p_source, 'system'),
    p_actor_id, p_note, p_metadata
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Internal use only: callable by other SECURITY DEFINER functions (which run as
-- the owner), never directly by clients.
REVOKE ALL ON FUNCTION public.log_transaction_event(bigint, uuid, text, text, uuid, text, jsonb)
  FROM public, anon, authenticated;

-- 5. create_cash_voucher: log a 'pending' event on creation ───────────────────
CREATE OR REPLACE FUNCTION public.create_cash_voucher(
  p_amount            numeric,
  p_recipient_name    text,
  p_recipient_email   text DEFAULT NULL,
  p_payment_method    text DEFAULT NULL,
  p_payment_reference text DEFAULT NULL
)
RETURNS public.cash_voucher
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_code  text;
  v_row   public.cash_voucher;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  -- Idempotency: a given payment can only ever map to one voucher.
  IF p_payment_reference IS NOT NULL THEN
    SELECT * INTO v_row
    FROM public.cash_voucher
    WHERE payment_reference = p_payment_reference
    LIMIT 1;
    IF FOUND THEN
      RETURN v_row;
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero' USING errcode = '22023';
  END IF;

  IF p_recipient_name IS NULL OR length(btrim(p_recipient_name)) = 0 THEN
    RAISE EXCEPTION 'Recipient name is required' USING errcode = '22023';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  LOOP
    v_code := 'CV-' || to_char(now() AT TIME ZONE 'utc', 'YYYY') || '-'
              || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cash_voucher WHERE code = v_code);
  END LOOP;

  INSERT INTO public.cash_voucher (
    code, amount, status, recipient_name, recipient_email,
    purchaser_id, purchaser_email, payment_method, payment_reference
  )
  VALUES (
    v_code, p_amount, 'pending', btrim(p_recipient_name), p_recipient_email,
    v_uid, v_email, p_payment_method, p_payment_reference
  )
  RETURNING * INTO v_row;

  PERFORM public.log_transaction_event(
    NULL, v_row.id, 'pending', 'client', v_uid, 'Voucher purchased',
    jsonb_build_object(
      'amount', p_amount,
      'payment_method', p_payment_method,
      'payment_reference', p_payment_reference
    )
  );

  RETURN v_row;

EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_row
    FROM public.cash_voucher
    WHERE payment_reference = p_payment_reference
    LIMIT 1;
    RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cash_voucher(numeric, text, text, text, text) TO authenticated;

-- 6. claim_cash_voucher: log a 'claimed' event ───────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_cash_voucher(p_code text)
RETURNS public.cash_voucher
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.cash_voucher;
BEGIN
  IF NOT (public.is_admin() OR public.is_staff()) THEN
    RAISE EXCEPTION 'Only staff can claim vouchers' USING errcode = '42501';
  END IF;

  UPDATE public.cash_voucher
  SET status = 'claimed', claimed_at = now(), claimed_by = auth.uid()
  WHERE code = p_code AND status = 'pending'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found or not claimable' USING errcode = 'P0002';
  END IF;

  PERFORM public.log_transaction_event(
    NULL, v_row.id, 'claimed', 'staff', auth.uid(), 'Claimed in-store', NULL
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_cash_voucher(text) TO authenticated;
