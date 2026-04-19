import { create } from "zustand";
import type { Promo } from "@/types/promo";

type CheckoutState = {
  promo: Promo;
  loyaltyEnabled: boolean;

  setPromo: (promo: Promo) => void;
  toggleLoyalty: () => void;
  resetCheckout: () => void;
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  promo: null,
  loyaltyEnabled: true,

  setPromo: (promo) => set({ promo }),

  toggleLoyalty: () =>
    set((state) => ({
      loyaltyEnabled: !state.loyaltyEnabled,
    })),

  resetCheckout: () =>
    set({
      promo: null,
      loyaltyEnabled: true,
    }),
}));