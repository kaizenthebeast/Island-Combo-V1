-- ─────────────────────────────────────────────────────────────────────────────
-- Loyalty card provisioning (§3.8)
--
-- Every member now gets a permanent, unique loyalty card number automatically,
-- so the system is "card-ready" — a physical card can be issued for an account
-- at any time, and pre-existing balances have a member to attach to.
--
--   • loyalty_card_number       — auto-generated, UNIQUE, NOT NULL. The member's
--                                 permanent number (immutable identity).
--   • loyverse_customer_code    — NEW, nullable, UNIQUE. The legacy Loyverse POS
--                                 card code, set when an existing customer claims
--                                 their pre-existing points. Kept separate so it
--                                 never collides with the system-issued number.
--   • loyalty_card_linked_at    — when a real/physical card is linked or activated
--                                 (drives has_perks). Stays nullable.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Legacy POS code for migrating pre-existing Loyverse balances.
ALTER TABLE public.profile
  ADD COLUMN IF NOT EXISTS loyverse_customer_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profile'::regclass AND conname = 'profile_loyverse_customer_code_key'
  ) THEN
    ALTER TABLE public.profile ADD CONSTRAINT profile_loyverse_customer_code_key UNIQUE (loyverse_customer_code);
  END IF;
END $$;

-- 2) Card-number generator — a 13-digit numeric, unique via a sequence.
CREATE SEQUENCE IF NOT EXISTS public.loyalty_card_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.gen_loyalty_card_number()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$ SELECT (1000000000000 + nextval('public.loyalty_card_seq'))::text $$;

-- 3) Auto-assign on profile insert (covers every creation path, incl. explicit NULL).
CREATE OR REPLACE FUNCTION public.set_loyalty_card_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.loyalty_card_number IS NULL THEN
    NEW.loyalty_card_number := public.gen_loyalty_card_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_loyalty_card_number ON public.profile;
CREATE TRIGGER trg_set_loyalty_card_number
  BEFORE INSERT ON public.profile
  FOR EACH ROW EXECUTE FUNCTION public.set_loyalty_card_number();

-- 4) Backfill existing members who don't have a number yet.
UPDATE public.profile
SET loyalty_card_number = public.gen_loyalty_card_number()
WHERE loyalty_card_number IS NULL;

-- 5) Every member has one now → enforce it. (UNIQUE already exists.)
ALTER TABLE public.profile ALTER COLUMN loyalty_card_number SET NOT NULL;
