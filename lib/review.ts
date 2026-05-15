'use server'

import { createClient } from './supabase/server'
import type { ProductReview, AddReviewPayload, UpdateReviewPayload } from '@/types/review'

export const getProductReviews = async (slug: string): Promise<ProductReview[]> => {
  const supabase = await createClient()

  // Step 1: Get product_id from slug
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('product_id')
    .eq('slug', slug)
    .single()

  if (productError) throw new Error(productError.message)
  if (!product) throw new Error('Product not found')

  // Step 2: Fetch reviews using product_id
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profile (
        first_name,
        last_name,
        profile_url
      ),
      review_images (
        id,
        image_path,
        sort_order
      )
    `)
    .eq('product_id', product.product_id)
    .order('helpful_count', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data ?? []
}

export const getReviewEligibility = async (product_id: number, order_id: number) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { data, error } = await supabase
    .from('reviewable_products')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .eq('order_id', order_id)
    .single()

  if (error) return { success: false, status: 403, message: error.message }
  if (!data) return { success: false, status: 403, message: 'You are not eligible to review this product' }

  return { success: true, status: 200, message: 'Eligible to review', data }
}

export const addProductReview = async (payload: AddReviewPayload) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      product_id: payload.product_id,
      order_id: payload.order_id,
      rating: payload.rating,
      title: payload.title ?? null,
      body: payload.body ?? null,
    })

  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 201, message: 'Review successfully submitted' }
}

export const updateProductReview = async (review_id: number, payload: UpdateReviewPayload) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { error } = await supabase
    .from('reviews')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', review_id)
    .eq('user_id', user.id)

  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, message: 'Review successfully updated' }
}

export const removeProductReview = async (review_id: number) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', review_id)
    .eq('user_id', user.id)

  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, message: 'Review successfully deleted' }
}

export const voteProductReview = async (review_id: number, is_helpful: boolean) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, status: 401, message: 'Unauthorized' }

  const { error } = await supabase
    .from('review_votes')
    .upsert(
      { review_id, user_id: user.id, is_helpful },
      { onConflict: 'review_id, user_id' }
    )

  if (error) return { success: false, status: 403, message: error.message }

  return { success: true, status: 200, message: 'Vote recorded' }
}