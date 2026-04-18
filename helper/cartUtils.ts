import type { CartItem } from "@/types/cart";

export const calculateCartTotals = (cart: CartItem[]) => {
  return {
    totalQty: cart.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cart.reduce((sum, item) => {
      return sum + item.final_price * item.quantity;
    }, 0),
  };
};