-- ─────────────────────────────────────────────────────────────────────────────
-- Constrain products.type to the canonical set: 'Physical' | 'Digital'.
--
-- The §3.9 payment rule (no Cash on Delivery for digital products) keys on the
-- exact literal 'Digital', and the Fetch Available Payment Methods API matches
-- products.type against it. Free-form text invites drift ('digital', 'dp', '') —
-- any of which would silently break that rule. This locks the column down so a
-- product created as Digital is ALWAYS stored exactly as 'Digital'.
--
--   • Backfill the one legacy NULL ('Soda') to 'Physical'.
--   • Default new rows to 'Physical' (a safety net; the app always sends a type).
--   • NOT NULL + CHECK so the database itself rejects anything off-vocabulary.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- Backfill any pre-type rows so NOT NULL / CHECK can be added.
update public.products
   set type = 'Physical'
 where type is null or type not in ('Physical', 'Digital');

alter table public.products alter column type set default 'Physical';
alter table public.products alter column type set not null;

alter table public.products drop constraint if exists products_type_check;
alter table public.products
  add constraint products_type_check check (type in ('Physical', 'Digital'));

commit;
