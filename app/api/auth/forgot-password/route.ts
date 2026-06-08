import { NextRequest } from 'next/server';
import { requestPasswordReset } from '@/lib/auth';
import { HTTP, apiError, apiResult, toApiError } from '@/shared/lib/http/respond';

export async function POST(request: NextRequest) {
    const { email } = await request.json();

    if (!email) {
        return apiError('Email is required', HTTP.BAD_REQUEST);
    }

    try {
        const result = await requestPasswordReset(email);
        if (!result.success) return apiError(result.message, result.status);

        return apiResult({ message: 'Password reset email sent successfully' });
    } catch (error) {
        return toApiError(error);
    }
}
