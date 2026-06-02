import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HTTP, apiError, apiResult, toApiError } from '@/lib/api/respond';



export async function POST(request: NextRequest) {
    const { email, password, guestUserId } = await request.json();

    if (!email || !password) {
        return apiError('Email and password are required', HTTP.BAD_REQUEST);
    }

    const supabase = await createClient();

    try {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/sign-up-success`
            }
        })

        if (error) {
            return apiError(error.message, HTTP.BAD_REQUEST);
        }

        if (guestUserId) {
            const response = apiResult({ redictTo: '/auth/sign-up-success' });
            response.cookies.set('guest_user_id', guestUserId, {
                path: '/',
                maxAge: 600, // 10 minutes
                httpOnly: true,
                sameSite: 'lax'
            });
            return response;
        }

        return apiResult({
            message: 'Signup successful, please check your email to confirm your account.',
            redirectTo: '/auth/sign-up-success'
        });

    } catch (error) {
        return toApiError(error);
    }
}
