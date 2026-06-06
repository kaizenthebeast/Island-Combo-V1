-- ─────────────────────────────────────────────────────────────────────────────
-- Public order reference (anti-enumeration)
--
-- orders.order_id (bigint identity) stays the internal PK — fast joins/FKs and
-- human-friendly for staff. But a sequential id leaks business volume when shown
-- to customers (a buyer who sees "#7" knows ~7 orders exist). So every order also
-- gets an unguessable UUID `public_ref` that is what customer-facing URLs and
-- displays use. Internal ids are never exposed to customers.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_ref uuid;

UPDATE public.orders SET public_ref = gen_random_uuid() WHERE public_ref IS NULL;

ALTER TABLE public.orders ALTER COLUMN public_ref SET DEFAULT gen_random_uuid();
ALTER TABLE public.orders ALTER COLUMN public_ref SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND conname = 'orders_public_ref_key'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_public_ref_key UNIQUE (public_ref);
  END IF;
END $$;
