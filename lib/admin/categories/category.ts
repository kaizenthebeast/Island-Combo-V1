'use server'
/** Admin category CRUD. */
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Category } from '@/lib/types/category'
import type { AddCategoryFormValues, EditCategoryFormValues } from '@/lib/validators/category'

// READ (paginated parents + their children)

export type CategoriesSortKey = 'category_id' | 'name'

export type CategoriesPageInput = {
  page: number
  pageSize: number
  search?: string
  filter?: string                          // 'ACTIVE' | 'ARCHIVED' | 'All'
  sortKey?: CategoriesSortKey
  sortDir?: 'asc' | 'desc'
}

export type CategoriesPageResult = {
  parents: Category[]
  children: Category[]                     // only children belonging to the current page of parents
  total: number
}

export const getCategoriesPage = async (
  input: CategoriesPageInput,
): Promise<CategoriesPageResult> => {
  const supabase = await createClient()

  const {
    page,
    pageSize,
    search,
    filter,
    sortKey = 'name',
    sortDir = 'asc',
  } = input

  let parentQuery = supabase
    .from('category')
    .select('category_id, name, slug, parent_id, is_active', { count: 'exact' })
    .is('parent_id', null)

  if (filter === 'ACTIVE')   parentQuery = parentQuery.eq('is_active', true)
  if (filter === 'ARCHIVED') parentQuery = parentQuery.eq('is_active', false)

  const q = search?.trim()
  if (q) {
    const safe = q.replace(/[\\%_,]/g, (c) => `\\${c}`)
    parentQuery = parentQuery.ilike('name', `%${safe}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  parentQuery = parentQuery
    .order(sortKey, { ascending: sortDir === 'asc' })
    .range(from, to)

  const { data: parentRows, error: parentErr, count } = await parentQuery
  if (parentErr) throw new Error(parentErr.message)

  const parents: Category[] = (parentRows ?? []).map((c) => ({
    id: c.category_id,
    name: c.name,
    slug: c.slug,
    parent_id: c.parent_id ?? null,
    is_active: c.is_active,
  }))

  // Fetch only the children of THIS page's parents — keeps the second
  // query bounded even when the categories table grows.
  let children: Category[] = []
  if (parents.length > 0) {
    const parentIds = parents.map((p) => p.id)

    const { data: childRows, error: childErr } = await supabase
      .from('category')
      .select('category_id, name, slug, parent_id, is_active')
      .in('parent_id', parentIds)

    if (childErr) throw new Error(childErr.message)

    children = (childRows ?? []).map((c) => ({
      id: c.category_id,
      name: c.name,
      slug: c.slug,
      parent_id: c.parent_id ?? null,
      is_active: c.is_active,
    }))
  }

  return { parents, children, total: count ?? 0 }
}

// CREATE

export const createCategory = async (data: AddCategoryFormValues) => {
  const supabase = await createClient()

  const { data: result, error } = await supabase.rpc('admin_create_category', {
    p_name: data.name,
    p_sub_categories: data.subCategories?.map((s) => s.name) ?? [],
  })

  if (error) return { success: false, status: 403, message: error.message }
  if (!result.success) return { success: false, status: 403, message: result.message }

  revalidatePath('/admin/categories')
  return { success: true, status: 201, message: 'Category successfully created' }
}

// UPDATE

export const updateCategory = async (id: number, data: EditCategoryFormValues) => {
  const supabase = await createClient()

  const { data: result, error } = await supabase.rpc('admin_update_category', {
    p_id: id,
    p_name: data.name,
    p_parent_id: data.parent_id ?? null,
    p_sub_categories: data.subCategories?.map((s) => s.name) ?? [],
  })

  if (error) return { success: false, status: 403, message: error.message }
  if (!result.success) return { success: false, status: 403, message: result.message }

  revalidatePath('/admin/categories')
  return { success: true, status: 200, message: 'Category successfully updated' }
}

// SOFT DELETE

export const softDeleteCategory = async (id: number) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('category')
    .update({ is_active: false })
    .or(`category_id.eq.${id},parent_id.eq.${id}`)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/categories')
  return id
}

// RESTORE

export const restoreCategory = async (id: number) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('category')
    .update({ is_active: true })
    .or(`category_id.eq.${id},parent_id.eq.${id}`)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/categories')
  return id
}
