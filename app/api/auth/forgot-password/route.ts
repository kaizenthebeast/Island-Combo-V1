import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HTTP, apiError, apiResult, toApiError } from '@/lib/api/respond';



export async function POST(request: NextRequest) {
    const { email } = await request.json();

    if (!email) {
        return apiError('Email is required', HTTP.BAD_REQUEST);
    }
    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/update-password`,
        });
        if (error){
            return apiError(error.message, HTTP.INTERNAL);
        }

        return apiResult({
            message: 'Password reset email sent successfully'
        })
       
    } catch (error) {
        return toApiError(error);
    }
}