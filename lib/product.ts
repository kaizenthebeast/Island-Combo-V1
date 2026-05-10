'use server'

import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProductCatalogItem, ProductDetails, AdminProduct } from '@/types/product'
import type { VariantWithUploadedImages } from './product-upload'
import { AddProductFormValues } from '@/form-schema/addProductSchema'


type ActionType = "product" | "variant"

export const getAllProducts = async (): Promise<ProductCatalogItem[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('product_catalog_mv').select('*')
  if (error) throw new Error(error.message)
  return data
}

export const getProductBySlug = async (p_slug: string): Promise<ProductDetails> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_product_by_slug', { p_slug })
  if (error) throw new Error(error.message)
  return data
}


// ADMIN SIDE
export const getAdminProducts = async (): Promise<AdminProduct[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // ensure JSON fields are arrays (safety)
  return (data ?? []).map((p) => ({
    ...p,
    product_details: p.product_details ?? [],
    variants: p.variants ?? [],
  }))
}

export const getAdminProductById = async (
  productId: number
): Promise<AdminProduct | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_products_mv')
    .select('*')
    .eq('product_id', productId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no rows
    throw new Error(error.message)
  }

  return {
    ...data,
    product_details: data.product_details ?? [],
    variants: data.variants ?? [],
  }
}

export type AddProductPayload = Omit<AddProductFormValues, 'variants'> & {
  variants: VariantWithUploadedImages[]
}


export const addAdminProduct = async (data: AddProductPayload) => {
  const supabase = await createClient()

  // No upload logic here — images are already in Supabase Storage
  const variants = data.variants.map((v) => ({
    price: v.price,
    stock: v.stock,
    is_active: v.is_active,
    attributes: v.attributes,
    images: v.images, // already { url, is_primary, sort_order }
  }))

  const payload = {
    ...data,
    variants,
  }

  const { data: result, error } = await supabase.rpc('add_admin_product', { payload })

  if (error) throw error
  await supabase.rpc('refresh_admin_products')
  revalidatePath('/admin/products')
  return result
}

export const updateAdminProduct = async (productId: number, data: AddProductPayload) => {
  const supabase = await createClient()

  const variants = data.variants.map((v) => ({
    ...(v.variant_id ? { variant_id: v.variant_id } : {}),
    price: v.price,
    stock: v.stock,
    is_active: v.is_active,
    attributes: v.attributes,
    images: v.images,
    pricing_tiers: v.pricing_tiers,
  }))

  const payload = {
    product_id: productId,
    ...data,
    variants,
  }

  const { data: result, error } = await supabase.rpc('update_admin_product', { payload })
  if (error) throw error

  revalidatePath('/admin/products')
  return result
}


export const deleteProduct = async (id: number, type: ActionType) => {
  // create connections
  const supabase = await createClient();

  // Guard to make sure only admin 
  // 1. Auth guard — only admins can delete
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, status: 401, message: "Unauthorized" };
  }

  //check the actions (variant / product)
  if (type === "product") {
    const { error, count } = await supabase.from('products').delete({ count: "exact" }).eq("product_id", id)

    if (error) {
      return { success: false, status: 403, message: error.message };
    }

    if (count === 0) {
      return { success: false, status: 404, message: "Product not found" }
    }
    revalidatePath("/admin/products")
    return { sucess: true, status: 200, message: "Product successfully deleted" }

  } else {
    const { error, count } = await supabase.from('product_variants').delete({ count: "exact" }).eq("variant_id", id)

    if (error) {
      return { success: false, status: 403, message: error.message };
    }

    if (count === 0) {
      return { success: false, status: 404, message: "Variant not found" }
    }
    revalidatePath("/admin/products")
    return { success: true, status: 200, message: "Variant successfully deleted" }
  }


}




export const getAllSubCategories = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('category')
    .select('category_id, name')
    .not('parent_id', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  return data;
}

export const getAllParentCategories = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('category')
    .select('category_id, name')
    .is('parent_id', null)

  if (error) {
    throw new Error(error.message)
  }

  return data;
}