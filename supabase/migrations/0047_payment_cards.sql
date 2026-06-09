-- Saved payment cards — PCI-SAFE by construction.
-- This table stores ONLY non-sensitive display metadata: cardholder name, brand,
-- the last 4 digits, and expiry. There is intentionally NO column for the full
-- card number (PAN) or the CVV/security code — storing those is prohibited by
-- PCI-DSS. The client form derives brand + last4 and discards the rest; the PAN
-- and CVV never reach the server. Real charging / auto-fill will be delegated to
-- PayPal Vault later (add a `paypal_vault_token` column then).

CREATE TABLE IF NOT EXISTS public.payment_cards (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cardholder_name text NOT NULL,
  brand           text NOT NULL,                       -- visa | mastercard | amex | discover | diners | jcb | card
  last4           text NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  exp_month       smallint NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year        smallint NOT NULL CHECK (exp_year BETWEEN 2000 AND 2100),
  is_active       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_cards_user_idx ON public.payment_cards (user_id, created_at DESC);
-- At most one active card per user (the one used to speed up checkout).
CREATE UNIQUE INDEX IF NOT EXISTS payment_cards_one_active_per_user
  ON public.payment_cards (user_id) WHERE is_active;

ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_cards_select ON public.payment_cards
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY payment_cards_insert ON public.payment_cards
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY payment_cards_update ON public.payment_cards
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY payment_cards_delete ON public.payment_cards
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_cards TO authenticated;
