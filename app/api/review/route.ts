import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { HTTP, apiOk, apiError, toApiError } from '@/lib/api/respond'
import { getProductReviews } from '@/lib/reviews/index'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const user = await requireUser();
        if (!user) return apiError('Unthorized', HTTP.UNAUTHORIZED)
        const { slug } = params

        const data = await getProductReviews(slug);
        if (!data.reviews) return apiError('Reviews not found', HTTP.NOT_FOUND)

        return apiOk(data.reviews)
    } catch (error: unknown) {
        return toApiError(error)
    }
}

export async function POST(req: NextRequest){
    
}