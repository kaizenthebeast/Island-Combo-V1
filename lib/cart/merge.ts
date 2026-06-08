/** Cart Merge (§3.3): fold a guest cart into the signed-in user's cart. */
import { createClient } from '@/lib/supabase/server'
import { AppError, HTTP } from '@/shared/lib/http/respond'

// Delegates to the merge_cart RPC (atomic + cross-user, so it must run
// SECURITY DEFINER in the DB). Prioritises the user's saved quantities, drops
// duplicate guest lines, carries over the guest's promo only if the user has
// none, then deletes the guest cart + header. No-op when ids match.
export const mergeGuestCart = async (guestUserId: string, authUserId: string) => {
  if (!guestUserId || guestUserId === authUserId) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('merge_cart', {
    p_guest_user_id: guestUserId,
    p_auth_user_id: authUserId,
  })
  if (error) throw new AppError(`Failed to merge cart: ${error.message}`, HTTP.INTERNAL)
}
