'use server'
/** Admin promo-code CRUD. */

import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { PromoCode, PromoCodeRow, PromoCodeEffectiveStatus } from '@/shared/types/promo-code'
import type { AddPromoCodeFormValues, EditPromoCodeFormValues } from '@/lib/validations/promo-code'

// helpers

const deriveEffectiveStatus = (promoCode: PromoCode): PromoCodeEffectiveStatus => {
  if (promoCode.status === 'ARCHIVED') return 'ARCHIVED'
  if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) return 'EXPIRED'
  if (promoCode.status === 'DRAFT') return 'DRAFT'
  return 'ACTIVE'
}

// READ (all)

export const getPromoCodes = async (): Promise<PromoCodeRow[]> => {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promo')
    .select('id, code, value, min_quantity, expires_at, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((item) => {
    const promoCode: PromoCode = {
      id: item.id,
      code: item.code,
      value: item.value,
      min_quantity: item.min_quantity ?? null,
      expires_at: item.expires_at ?? null,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }
    return { ...promoCode, effective_status: deriveEffectiveStatus(promoCode) }
  })
}

// READ (paginated)

export type PromoCodesSortKey = 'id' | 'code' | 'value' | 'expires_at' | 'created_at'

export type PromoCodesPageInput = {
  page: number
  pageSize: number
  search?: string                          // matches code
  filter?: string                          // PromoCodeEffectiveStatus or 'All'
  sortKey?: PromoCodesSortKey
  sortDir?: 'asc' | 'desc'
}

export type PromoCodesPageResult = {
  rows: PromoCodeRow[]
  total: number
}

export const getPromoCodesPage = async (input: PromoCodesPageInput): Promise<PromoCodesPageResult> => {
  await assertAdmin()
  const supabase = await createClient()

  const {
    page,
    pageSize,
    search,
    filter,
    sortKey = 'created_at',
    sortDir = 'desc',
  } = input

  const nowIso = new Date().toISOString()

  let query = supabase
    .from('promo')
    .select('id, code, value, min_quantity, expires_at, status, created_at, updated_at', {
      count: 'exact',
    })

  // Translate effective status → SQL predicates
  switch (filter) {
    case 'ACTIVE':
      query = query.eq('status', 'ACTIVE')
        .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
      break
    case 'DRAFT':
      query = query.eq('status', 'DRAFT')
        .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
      break
    case 'EXPIRED':
      query = query.neq('status', 'ARCHIVED')
        .not('expires_at', 'is', null)
        .lt('expires_at', nowIso)
      break
    case 'ARCHIVED':
      query = query.eq('status', 'ARCHIVED')
      break
    // 'All' / undefined → no filter
  }

  const q = search?.trim()
  if (q) {
    const safe = q.replace(/[\\%_,]/g, (c) => `\\${c}`)
    query = query.ilike('code', `%${safe}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.order(sortKey, { ascending: sortDir === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const rows: PromoCodeRow[] = (data ?? []).map((item) => {
    const promoCode: PromoCode = {
      id: item.id,
      code: item.code,
      value: item.value,
      min_quantity: item.min_quantity ?? null,
      expires_at: item.expires_at ?? null,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }
    return { ...promoCode, effective_status: deriveEffectiveStatus(promoCode) }
  })

  return { rows, total: count ?? 0 }
}

// CREATE

export const createPromoCode = async (data: AddPromoCodeFormValues) => {
  await assertAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('promo').insert({
    code: data.code.toUpperCase(),
    value: data.value,
    min_quantity: data.min_quantity ?? null,
    expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
    status: data.status,
  })

  if (error) {
    if (error.code === '23505')
      return { success: false, status: 409, message: 'A promo code with this code already exists.' }
    return { success: false, status: 403, message: error.message }
  }

  revalidatePath('/admin/content-management/promotional-codes')
  return { success: true, status: 201, message: 'Promo code successfully created' }
}

// UPDATE

export const updatePromoCode = async (id: number, data: EditPromoCodeFormValues) => {
  await assertAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('promo')
    .update({
      code: data.code.toUpperCase(),
      value: data.value,
      min_quantity: data.min_quantity ?? null,
      expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      status: data.status,
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505')
      return { success: false, status: 409, message: 'A promo code with this code already exists.' }
    return { success: false, status: 403, message: error.message }
  }

  revalidatePath('/admin/content-management/promotional-codes')
  return { success: true, status: 200, message: 'Promo code successfully updated' }
}

// ARCHIVE

export const archivePromoCode = async (id: number) => {
  await assertAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('promo')
    .update({ status: 'ARCHIVED' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/content-management/promotional-codes')
  return id
}

// RESTORE

export const restorePromoCode = async (id: number) => {
  await assertAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('promo')
    .update({ status: 'ACTIVE' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/content-management/promotional-codes')
  return id
}
