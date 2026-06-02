-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security for public.addresses.
--
-- Symptom this fixes: adding an address returns 200 but nothing is written. The
-- INSERT is rejected by RLS ("new row violates row-level security policy"), the
-- server action returns { success:false } (it doesn't throw), and the form used
-- to swallow that result — so it looked successful.
--
-- Policy model: an address belongs to exactly one user; a user may do anything
-- with their OWN rows (user_id = auth.uid()). On INSERT, WITH CHECK guarantees a
-- user can only create rows owned by themselves.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Read own
DROP POLICY IF EXISTS addresses_select_own ON public.addresses;
CREATE POLICY addresses_select_own
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create own (WITH CHECK pins ownership to the caller)
DROP POLICY IF EXISTS addresses_insert_own ON public.addresses;
CREATE POLICY addresses_insert_own
  ON public.addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update own
DROP POLICY IF EXISTS addresses_update_own ON public.addresses;
CREATE POLICY addresses_update_own
  ON public.addresses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Delete own
DROP POLICY IF EXISTS addresses_delete_own ON public.addresses;
CREATE POLICY addresses_delete_own
  ON public.addresses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
