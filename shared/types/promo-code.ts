/** Shared promo-code types. */
export type PromoCodeStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

export type PromoCodeEffectiveStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'

export type PromoCode = {
  id: number
  code: string
  value: number            // promo.value (percentage 0–100)
  min_quantity: number | null
  expires_at: string | null    // promo.expires_at (ISO string)
  status: PromoCodeStatus
  created_at: string
  updated_at: string
}

export type PromoCodeRow = PromoCode & {
  effective_status: PromoCodeEffectiveStatus
}
