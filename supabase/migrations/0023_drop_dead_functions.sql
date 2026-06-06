-- ─────────────────────────────────────────────────────────────────────────────
-- Drop orphaned functions (verified unused: no app calls, no references from
-- other functions, not triggers/event-triggers/auth-hooks).
--
--   • get_admin_user_directory() — superseded by the direct `admin_user_mv` query
--     in getUsersPage; the RPC wrapper is no longer called.
--   • validate_promo_code(text,int) — promo validation moved to TypeScript
--     (lib/promotional-codes + lib/cart/promo-rules); the RPC is superseded.
--   • admin_delete_category(bigint) — hard-delete RPC never wired to the app
--     (the admin UI archives via soft-delete); removed as unused.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_admin_user_directory();
DROP FUNCTION IF EXISTS public.validate_promo_code(text, integer);
DROP FUNCTION IF EXISTS public.admin_delete_category(bigint);
