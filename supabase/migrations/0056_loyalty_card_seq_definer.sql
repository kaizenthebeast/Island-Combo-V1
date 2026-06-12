-- 0056: gen_loyalty_card_number() runs as DEFINER so profile inserts don't
-- need grants on loyalty_card_seq.
--
-- public.loyalty_card_seq has no ACL (owner-only; 0051 keeps role grants
-- minimal), but trg_set_loyalty_card_number fires on EVERY profile insert and
-- calls nextval() — so any inserter failed with "permission denied for
-- sequence loyalty_card_seq": service_role in the invite-user edge function
-- (broke staff invites: provisioning 502 → auth-user rollback → dead link in
-- the already-sent email) and authenticated in the lazy customer-profile
-- upsert (features/account/api/address.ts). Encapsulating the privilege in
-- the function fixes every inserter while the sequence itself stays locked.

alter function public.gen_loyalty_card_number()
  security definer
  set search_path = '';

-- Explicit, documented execute for the API roles that insert profiles.
-- (Minting a card number is harmless — it only advances the sequence.)
grant execute on function public.gen_loyalty_card_number() to authenticated, service_role;
