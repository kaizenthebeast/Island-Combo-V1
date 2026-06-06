-- ─────────────────────────────────────────────────────────────────────────────
-- Grant the `authenticated` API role table privileges that were never applied.
--
-- RLS is the row-level security boundary, but Postgres still checks TABLE-level
-- privileges first. Several tables (created in earlier migrations without grants)
-- left `authenticated` with no privilege, so any direct query from a real browser
-- session failed with "permission denied for table ..." — even though RLS would
-- have allowed the row. Admin/back-office paths hid this because they go through
-- SECURITY DEFINER RPCs (which run as the function owner and bypass grants).
--
-- Privileges mirror each table's RLS design:
--   • Read-only here — all writes happen via SECURITY DEFINER RPCs:
--       orders, order_items, transaction_event, cash_voucher
--   • Owner/admin-managed, written directly by the app (RLS gates the rows):
--       cart_meta, profile_pts, profile_pts_transaction_records
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Customer order reads (getMyOrderDetail / getMyOrdersPage) + cash-voucher history.
GRANT SELECT ON public.orders            TO authenticated;
GRANT SELECT ON public.order_items       TO authenticated;
GRANT SELECT ON public.transaction_event TO authenticated;
GRANT SELECT ON public.cash_voucher      TO authenticated;

-- Cart header (apply/remove discount + points) — owner-scoped writes via RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_meta TO authenticated;

-- Loyalty balance + ledger — SELECT (self|admin) for reads; INSERT/UPDATE/DELETE
-- (admin) for the Loyverse importer, which writes directly under is_admin RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_pts                     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_pts_transaction_records TO authenticated;
