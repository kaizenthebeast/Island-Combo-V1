/** Zustand store for checkout state. */
import { create } from 'zustand'
import type { PromoCode } from '@/types/promo-code'

type AppliedPromoCode = Pick<PromoCode, 'code' | 'value'>

export type PaymentMethod = "cod" | "card"
export type Fulfillment = "deliver" | "pickup"

type CheckoutState = {
  promoCode: AppliedPromoCode | null
  loyaltyEnabled: boolean
  loyaltyPoints: number
  shippingFee: number | null
  shippingMethod: "GCR" | "QPI" | null
  paymentMethod: PaymentMethod

  // Lifted from AddressContainer so the Place Order button (AddressBillingSummary)
  // and the PayPal card fields (CardPaymentFields) — siblings — can read them.
  fulfillment: Fulfillment
  selectedAddressId: number | null

  // True while an order is being placed (disables the Place Order button).
  placing: boolean

  // Registered by CardPaymentFields so the external Place Order button can
  // trigger the in-provider PayPal card submit. Null until the card form mounts.
  submitCard: (() => Promise<void>) | null

  setPromoCode: (promoCode: AppliedPromoCode | null) => void
  setLoyaltyPoints: (pts: number) => void
  toggleLoyalty: () => void
  setShipping: (fee: number | null, method: "GCR" | "QPI" | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setFulfillment: (fulfillment: Fulfillment) => void
  setSelectedAddressId: (id: number | null) => void
  setPlacing: (placing: boolean) => void
  setSubmitCard: (submit: (() => Promise<void>) | null) => void
  resetCheckout: () => void
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  promoCode: null,
  loyaltyEnabled: true,
  loyaltyPoints: 3,
  shippingFee: null,
  shippingMethod: null,
  paymentMethod: "cod",
  fulfillment: "deliver",
  selectedAddressId: null,
  placing: false,
  submitCard: null,

  setPromoCode: (promoCode) => set({ promoCode }),
  setLoyaltyPoints: (pts) => set({ loyaltyPoints: pts }),

  toggleLoyalty: () => set((state) => ({ loyaltyEnabled: !state.loyaltyEnabled })),

  setShipping: (fee, method) => set({ shippingFee: fee, shippingMethod: method }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setFulfillment: (fulfillment) => set({ fulfillment }),
  setSelectedAddressId: (id) => set({ selectedAddressId: id }),
  setPlacing: (placing) => set({ placing }),
  setSubmitCard: (submit) => set({ submitCard: submit }),

  resetCheckout: () =>
    set({
      promoCode: null,
      loyaltyEnabled: true,
      loyaltyPoints: 0,
      shippingFee: null,
      shippingMethod: null,
      paymentMethod: "cod",
      fulfillment: "deliver",
      selectedAddressId: null,
      placing: false,
      submitCard: null,
    }),
}))
