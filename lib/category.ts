'use server'
import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { Category } from '@/types/category'
import type { AddCategoryFormValues, EditCategoryFormValues } from '@/form-schema/categorySchema'

// ─── READ ─────────────────────────────────────────────────────────────────────

export const getCategories = async (): Promise<Category[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('category')
        .select('category_id, name, parent_id')
        .order('name', { ascending: true })

    if (error) throw new Error(error.message)

    return (data ?? []).map((c) => ({
        id: c.category_id,
        name: c.name,
        parent_id: c.parent_id ?? null,
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
    .select('category_id, name')
    .is('parent_id', null)
  if (error) throw new Error(error.message)
  return data
}



// ─── CREATE ───────────────────────────────────────────────────────────────────

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

// ─── UPDATE ───────────────────────────────────────────────────────────────────

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

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteCategory = async (id: number, type: 'category') => {
    const supabase = await createClient()

    const { data: result, error } = await supabase.rpc('admin_delete_category', {
        p_id: id,
    })

    if (error) return { success: false, status: 403, message: error.message }
    if (!result.success) return { success: false, status: 404, message: result.message }

    revalidatePath('/admin/categories')
    return { success: true, status: 200, message: 'Category successfully deleted' }
}