import type { Promo } from "@/types/promo";

export function calculateTotals({subtotal,promo,loyaltyDiscount,}: {
  subtotal: number;
  promo: Promo | null;
  loyaltyDiscount: number;
}) {
  const promoDiscount = promo ? (subtotal * promo.value) / 100 : 0;
  const total = subtotal - promoDiscount - loyaltyDiscount;

  return {
    promoDiscount,
    total,
  };
}