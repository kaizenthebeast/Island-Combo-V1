import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { loginWithEmail } from '@/features/auth/api';
import { logSecurityEvent } from '@/features/audit/api/security';
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond';

export async function POST(request: NextRequest) {
    const { email, password, guestUserId } = await request.json();

    if (!email || !password) {
        return apiError('Email and password are required', HTTP.BAD_REQUEST);
    }

    try {
        const result = await loginWithEmail({ email, password, guestUserId });
        if (!result.success) {
            // Security audit: a failed login is a security signal (wrong password,
            // unknown account, credential stuffing). Logged non-blocking; the RPC
            // resolves the targeted account by email server-side.
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
            waitUntil(logSecurityEvent({
                eventType: 'login_failed',
                email,
                ipAddress: ip,
                userAgent: request.headers.get('user-agent'),
                route: '/api/auth/login',
                details: { reason: result.message },
            }));
            return apiError(result.message, result.status);
        }

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
