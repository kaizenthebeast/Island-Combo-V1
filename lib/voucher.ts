'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Voucher, VoucherRow, VoucherEffectiveStatus } from '@/types/voucher'
import type { AddVoucherFormValues, EditVoucherFormValues } from '@/form-schema/voucherSchema'

// ─── helpers ──────────────────────────────────────────────────────────────────

const deriveEffectiveStatus = (voucher: Voucher): VoucherEffectiveStatus => {
  if (voucher.status === 'ARCHIVED') return 'ARCHIVED'
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) return 'EXPIRED'
  if (voucher.status === 'DRAFT') return 'DRAFT'
  return 'ACTIVE'
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export const getVouchers = async (): Promise<VoucherRow[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promo')
    .select('id, code, value, min_quantity, expires_at, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((item) => {
    const voucher: Voucher = {
      id: item.id,
      code: item.code,
      value: item.value,
      min_quantity: item.min_quantity ?? null,
      expires_at: item.expires_at ?? null,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }
    return { ...voucher, effective_status: deriveEffectiveStatus(voucher) }
  })
}

// ─── READ (paginated) ─────────────────────────────────────────────────────────

export type VouchersSortKey = 'id' | 'code' | 'value' | 'expires_at' | 'created_at'

export type VouchersPageInput = {
  page: number
  pageSize: number
  search?: string                          // matches code
  filter?: string                          // VoucherEffectiveStatus or 'All'
  sortKey?: VouchersSortKey
  sortDir?: 'asc' | 'desc'
}

export type VouchersPageResult = {
  rows: VoucherRow[]
  total: number
}

export const getVouchersPage = async (input: VouchersPageInput): Promise<VouchersPageResult> => {
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

  const rows: VoucherRow[] = (data ?? []).map((item) => {
    const voucher: Voucher = {
      id: item.id,
      code: item.code,
      value: item.value,
      min_quantity: item.min_quantity ?? null,
      expires_at: item.expires_at ?? null,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }
    return { ...voucher, effective_status: deriveEffectiveStatus(voucher) }
  })

  return { rows, total: count ?? 0 }
}

// ─── APPLY (lookup by code) ───────────────────────────────────────────────────

export const applyVoucher = async (
  code: string,
  totalQty: number
): Promise<{ success: boolean; voucher?: { code: string; value: number }; message?: string }> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promo')
    .select('code, value, status, expires_at, min_quantity')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data)
    return { success: false, message: 'Voucher code not found.' }

  if (data.status === 'ARCHIVED' || data.status === 'DRAFT')
    return { success: false, message: 'This voucher is not active.' }

  if (data.expires_at && new Date(data.expires_at) < new Date())
    return { success: false, message: 'This voucher has expired.' }

  if (data.min_quantity != null && totalQty < data.min_quantity)
    return { success: false, message: `This voucher requires a minimum of ${data.min_quantity} items.` }

  return { success: true, voucher: { code: data.code, value: data.value } }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createVoucher = async (data: AddVoucherFormValues) => {
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
      return { success: false, status: 409, message: 'A voucher with this code already exists.' }
    return { success: false, status: 403, message: error.message }
  }

  revalidatePath('/admin/vouchers')
  return { success: true, status: 201, message: 'Voucher successfully created' }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateVoucher = async (id: number, data: EditVoucherFormValues) => {
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
      return { success: false, status: 409, message: 'A voucher with this code already exists.' }
    return { success: false, status: 403, message: error.message }
  }

  revalidatePath('/admin/vouchers')
  return { success: true, status: 200, message: 'Voucher successfully updated' }
}

// ─── ARCHIVE ──────────────────────────────────────────────────────────────────

export const archiveVoucher = async (id: number) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('promo')
    .update({ status: 'ARCHIVED' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/vouchers')
  return id
}

// ─── RESTORE ──────────────────────────────────────────────────────────────────

export const restoreVoucher = async (id: number) => {
  const supabase = await createClient()

  const { error } = await supabase
    .from('promo')
    .update({ status: 'ACTIVE' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/vouchers')
  return id
}