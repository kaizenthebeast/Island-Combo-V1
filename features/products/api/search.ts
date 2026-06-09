'use server'
/** Product search-suggestion queries. */
import { createClient } from '@/lib/supabase/server'

export type ProductSuggestion = {
  product_id: number
  name: string
  slug: string
  image_url: string | null
  base_price: number
  final_price: number
  discount: number | null
}

export const getProductSuggestions = async (
  query: string,
  limit = 8,
): Promise<ProductSuggestion[]> => {
  const q = query.trim()
  if (q.length < 2) return []

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_product_suggestions', {
    p_query: q,
    p_limit: Math.min(Math.max(limit, 1), 20),
  })

  if (error) throw new Error(error.message)
  return (data ?? []) as ProductSuggestion[]
}
