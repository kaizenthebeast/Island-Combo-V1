import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HTTP, apiError, apiResult, toApiError } from '@/lib/api/respond';

export async function POST(request: NextRequest) {
    const { email, password, guestUserId } = await request.json();

    if (!email || !password) {
        return apiError('Email and password are required', HTTP.BAD_REQUEST);
    }

    try {
        const supabase = await createClient();

        const { data: signInData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return apiError(error.message, HTTP.BAD_REQUEST);
        }

        const authUserId = signInData.session.user.id;

        // Merge cart if a guest user ID was passed from the client
        if (guestUserId && guestUserId !== authUserId) {
            const { error: mergeError } = await supabase.rpc('merge_cart', {
                p_guest_user_id: guestUserId,
                p_auth_user_id: authUserId,
            });
            if (mergeError) {
                throw new Error(`Failed to merge cart: ${mergeError.message}`);
            }
        }

        const { data: profile } = await supabase
            .from('profile')
            .select('role')
            .eq('user_id', authUserId)
            .single();

        return apiResult({
            role: profile?.role ?? 'user',
            redirectTo: profile?.role === 'admin' ? '/admin/products' : '/',
        });
    } catch (error) {
        return toApiError(error);
    }
}