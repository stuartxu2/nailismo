"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/shopify/cart";

/** Clears the cart cookie once on mount. Checkout completes on Shopify, then
 *  redirects here — so reaching this page means the bag is spent. */
export function ClearCartOnMount() {
  useEffect(() => {
    void clearCart();
  }, []);
  return null;
}
