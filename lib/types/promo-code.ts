/** Shared promo-voucher types. */
export type VoucherStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

export type VoucherEffectiveStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'

export type Voucher = {
  id: number               
  code: string             
  value: number            // promo.value (percentage 0–100)
  min_quantity: number | null 
  expires_at: string | null    // promo.expires_at (ISO string)
  status: VoucherStatus    
  created_at: string       
  updated_at: string       
}

export type VoucherRow = Voucher & {
  effective_status: VoucherEffectiveStatus
}