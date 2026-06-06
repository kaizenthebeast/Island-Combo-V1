import { NextRequest } from 'next/server';
import { signUpWithEmail } from '@/lib/auth';
import { HTTP, apiError, apiResult, toApiError } from '@/lib/api/respond';

export async function POST(request: NextRequest) {
    const { email, password, guestUserId } = await request.json();

    if (!email || !password) {
        return apiError('Email and password are required', HTTP.BAD_REQUEST);
    }

    try {
        const result = await signUpWithEmail({ email, password, guestUserId });
        if (!result.success) return apiError(result.message, result.status);

        const response = apiResult({
            message: 'Signup successful.',
            redirectTo: result.redirectTo,
        });

        // Fallback for when email confirmation IS enabled (no session yet): stash
        // the guest id so CartMerger can finish the merge after confirmation.
        // Readable by the client (not httpOnly) so CartMerger can pick it up.
        if (!result.sessionCreated && guestUserId) {
            response.cookies.set('guest_user_id', guestUserId, {
                path: '/',
                maxAge: 600, // 10 minutes
                httpOnly: false,
                sameSite: 'lax',
            });
        }

        return response;
    } catch (error) {
        return toApiError(error);
    }
}
