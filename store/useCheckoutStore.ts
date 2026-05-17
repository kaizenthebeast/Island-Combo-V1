import { create } from 'zustand'
import type { Voucher } from '@/types/voucher'

type AppliedVoucher = Pick<Voucher, 'code' | 'value'>

type CheckoutState = {
  voucher: AppliedVoucher | null
  loyaltyEnabled: boolean
  loyaltyPoints: number

  setVoucher: (voucher: AppliedVoucher | null) => void
  setLoyaltyPoints: (pts: number) => void
  toggleLoyalty: () => void
  resetCheckout: () => void
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  voucher: null,
  loyaltyEnabled: true,
  loyaltyPoints: 3,

  setVoucher: (voucher) => set({ voucher }),
  setLoyaltyPoints: (pts) => set({ loyaltyPoints: pts }),

  toggleLoyalty: () => set((state) => ({ loyaltyEnabled: !state.loyaltyEnabled })),

  resetCheckout: () =>
    set({
      voucher: null,
      loyaltyEnabled: true,
      loyaltyPoints: 0,
    }),
}))