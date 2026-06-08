import { NextRequest } from 'next/server';
import { loginWithEmail } from '@/lib/auth';
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond';

export async function POST(request: NextRequest) {
    const { email, password, guestUserId } = await request.json();

    if (!email || !password) {
        return apiError('Email and password are required', HTTP.BAD_REQUEST);
    }

    try {
        const result = await loginWithEmail({ email, password, guestUserId });
        if (!result.success) return apiError(result.message, result.status);

        return apiResult({ role: result.role, redirectTo: result.redirectTo });
    } catch (error) {
        return toApiError(error);
    }
}
