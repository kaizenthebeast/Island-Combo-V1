import type { Promo } from "@/types/promo";

export function calculateTotals({
  subtotal,
  promo,
  loyaltyDiscount,
}: {
  subtotal: number;
  promo: Promo;
  loyaltyDiscount: number;
}) {
  const discount = promo ? (subtotal * promo.value) / 100 : 0;

  const total = subtotal - discount - loyaltyDiscount;

  return {
    discount,
    total,
  };
}