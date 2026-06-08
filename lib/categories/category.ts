'use server'
/** Customer category reads. */
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types/category'

// READ

export const getCategories = async (): Promise<Category[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('category')
        .select('category_id, name, slug, parent_id, is_active')
        .order('name', { ascending: true })

    if (error) throw new Error(error.message)

    return (data ?? []).map((c) => ({
        id: c.category_id,
        name: c.name,
        slug: c.slug,
        parent_id: c.parent_id ?? null,
        is_active: c.is_active,
    }))
}

export const getAllSubCategories = async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('category')
        .select('category_id, name')
        .not('parent_id', 'is', null)
    if (error) throw new Error(error.message)
    return data
}

export const getAllParentCategories = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('category')
    .select('category_id, name, slug')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export type CategoryWithChildren = {
  id: number
  name: string
  slug: string
  children: { id: number; name: string; slug: string }[]
}

export const getCategoryBySlug = async (
  slug: string,
): Promise<CategoryWithChildren | null> => {
  const supabase = await createClient()

  const { data: cat, error } = await supabase
    .from('category')
    .select('category_id, name, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!cat) return null

  const { data: childRows, error: childErr } = await supabase
    .from('category')
    .select('category_id, name, slug')
    .eq('parent_id', cat.category_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (childErr) throw new Error(childErr.message)

  return {
    id: cat.category_id,
    name: cat.name,
    slug: cat.slug,
    children: (childRows ?? []).map((c) => ({
      id: c.category_id,
      name: c.name,
      slug: c.slug,
    })),
  }
}
