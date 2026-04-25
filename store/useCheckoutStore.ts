import { create } from "zustand";
import type { Promo } from "@/types/promo";

type CheckoutState = {
  promo: Promo | null;
  loyaltyEnabled: boolean;
  loyaltyPoints: number;

  setPromo: (promo: Promo | null) => void;
  setLoyaltyPoints: (pts: number) => void;
  toggleLoyalty: () => void;
  resetCheckout: () => void;
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  promo: null,
  loyaltyEnabled: true,
  loyaltyPoints: 3,

  setPromo: (promo) => set({ promo }),
  setLoyaltyPoints: (pts) => set({ loyaltyPoints: pts }),

  toggleLoyalty: () => set((state) => ({ loyaltyEnabled: !state.loyaltyEnabled })),

  resetCheckout: () =>
    set({
      promo: null,
      loyaltyEnabled: true,
      loyaltyPoints: 0,
    }),
}));