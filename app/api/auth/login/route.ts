import { NextRequest } from 'next/server';
import { loginWithEmail } from '@/features/auth/api';
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond';

export async function POST(request: NextRequest) {
    const { email, password, guestUserId } = await request.json();

    if (!email || !password) {
        return apiError('Email and password are required', HTTP.BAD_REQUEST);
    }

    try {
        const result = await loginWithEmail({ email, password, guestUserId });
        if (!result.success) return apiError(result.message, result.status);

        // Browser clients use `redirectTo`/`role` and the session cookie; API
        // clients use the token bundle as `Authorization: Bearer <accessToken>`.
        return apiResult({
            role: result.role,
            redirectTo: result.redirectTo,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            tokenType: result.tokenType,
        });
    } catch (error) {
        return toApiError(error);
    }
}
