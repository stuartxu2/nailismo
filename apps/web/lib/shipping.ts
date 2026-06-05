// Single source of truth for the free-shipping threshold. Used by the cart
// progress nudge and the PDP "one more set" hint, and mirrored in the
// announcement ticker copy ("FREE SHIPPING OVER $35").
export const FREE_SHIPPING_THRESHOLD = 35;

/** Dollars still needed to unlock free shipping. 0 once the threshold is met. */
export function freeShippingRemaining(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}
