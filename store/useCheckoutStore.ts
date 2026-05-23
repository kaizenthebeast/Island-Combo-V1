import { create } from 'zustand'
import type { Voucher } from '@/types/voucher'

type AppliedVoucher = Pick<Voucher, 'code' | 'value'>

type CheckoutState = {
  voucher: AppliedVoucher | null
  loyaltyEnabled: boolean
  loyaltyPoints: number
  shippingFee: number | null
  shippingMethod: "GCR" | "QPI" | null

  setVoucher: (voucher: AppliedVoucher | null) => void
  setLoyaltyPoints: (pts: number) => void
  toggleLoyalty: () => void
  setShipping: (fee: number | null, method: "GCR" | "QPI" | null) => void
  resetCheckout: () => void
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  voucher: null,
  loyaltyEnabled: true,
  loyaltyPoints: 3,
  shippingFee: null,
  shippingMethod: null,

  setVoucher: (voucher) => set({ voucher }),
  setLoyaltyPoints: (pts) => set({ loyaltyPoints: pts }),

  toggleLoyalty: () => set((state) => ({ loyaltyEnabled: !state.loyaltyEnabled })),

  setShipping: (fee, method) => set({ shippingFee: fee, shippingMethod: method }),

  resetCheckout: () =>
    set({
      voucher: null,
      loyaltyEnabled: true,
      loyaltyPoints: 0,
      shippingFee: null,
      shippingMethod: null,
    }),
}))