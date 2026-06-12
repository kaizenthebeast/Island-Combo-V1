-- 0054: Standard FK delete policy for auth.users deletion.
--
-- Policy (standard for ecommerce):
--   1. Personal / operational data is deleted with the user (ON DELETE CASCADE):
--      profile, profile_pts, wishlist, reviews, review_votes
--      (cart, cart_meta, payment_cards, pending_checkout,
--       profile_pts_transaction_records, addresses-via-profile already cascade).
--   2. Financial records are RETAINED and the user reference is detached
--      (ON DELETE SET NULL): orders, cash_voucher. Order/voucher history must
--      survive account deletion for accounting, refunds and support.
--      cash_voucher keeps purchaser_email for post-deletion lookup.
--   3. Audit tables (audit_logs, security_audit_logs, transaction_event,
--      stock_movements/refunds actor columns) deliberately have no FK to
--      auth.users so they are immutable history; unchanged here.
--
-- Constraint names are preserved (incl. legacy names profiles_user_id_fkey on
-- profile and favorites_user_id_fkey on wishlist) so PostgREST embed hints,
-- if ever used, keep working.

-- 1) Personal data: delete with the user -----------------------------------

alter table public.profile
  drop constraint profiles_user_id_fkey;
alter table public.profile
  add constraint profiles_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.profile_pts
  drop constraint profile_pts_user_id_fkey;
alter table public.profile_pts
  add constraint profile_pts_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.wishlist
  drop constraint favorites_user_id_fkey;
alter table public.wishlist
  add constraint favorites_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.reviews
  drop constraint reviews_user_id_fkey;
alter table public.reviews
  add constraint reviews_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- reviews has a second FK on the same column pointing at profile; it must
-- cascade too or it would block the profile cascade above.
alter table public.reviews
  drop constraint reviews_user_id_profile_fkey;
alter table public.reviews
  add constraint reviews_user_id_profile_fkey
    foreign key (user_id) references public.profile(user_id) on delete cascade;

alter table public.review_votes
  drop constraint review_votes_user_id_fkey;
alter table public.review_votes
  add constraint review_votes_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- 2) Financial records: keep the rows, detach the user ----------------------

-- was ON DELETE CASCADE: deleting a user must NOT erase order history.
alter table public.orders
  drop constraint orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;

alter table public.cash_voucher
  alter column purchaser_id drop not null;

alter table public.cash_voucher
  drop constraint cash_voucher_purchaser_id_fkey;
alter table public.cash_voucher
  add constraint cash_voucher_purchaser_id_fkey
    foreign key (purchaser_id) references auth.users(id) on delete set null;

alter table public.cash_voucher
  drop constraint cash_voucher_claimed_by_fkey;
alter table public.cash_voucher
  add constraint cash_voucher_claimed_by_fkey
    foreign key (claimed_by) references auth.users(id) on delete set null;
