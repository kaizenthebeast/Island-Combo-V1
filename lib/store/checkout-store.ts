/** Zustand store for checkout state. */
import { create } from 'zustand'
import type { Voucher } from '@/lib/types/voucher'

type AppliedVoucher = Pick<Voucher, 'code' | 'value'>

export type PaymentMethod = "cod" | "card"

type CheckoutState = {
  voucher: AppliedVoucher | null
  loyaltyEnabled: boolean
  loyaltyPoints: number
  shippingFee: number | null
  shippingMethod: "GCR" | "QPI" | null
  paymentMethod: PaymentMethod

  setVoucher: (voucher: AppliedVoucher | null) => void
  setLoyaltyPoints: (pts: number) => void
  toggleLoyalty: () => void
  setShipping: (fee: number | null, method: "GCR" | "QPI" | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  resetCheckout: () => void
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  voucher: null,
  loyaltyEnabled: true,
  loyaltyPoints: 3,
  shippingFee: null,
  shippingMethod: null,
  paymentMethod: "cod",

  setVoucher: (voucher) => set({ voucher }),
  setLoyaltyPoints: (pts) => set({ loyaltyPoints: pts }),

  toggleLoyalty: () => set((state) => ({ loyaltyEnabled: !state.loyaltyEnabled })),

  setShipping: (fee, method) => set({ shippingFee: fee, shippingMethod: method }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  resetCheckout: () =>
    set({
      voucher: null,
      loyaltyEnabled: true,
      loyaltyPoints: 0,
      shippingFee: null,
      shippingMethod: null,
      paymentMethod: "cod",
    }),
}))