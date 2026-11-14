import { classifyProduct } from "./product-class";
import type { ShopifyProduct } from "./types";

/**
 * From a newest-first product list, keep only real nail sets (no gift cards,
 * care essentials, or explicitly excluded products such as the made-to-order
 * Custom Nail Set) and cap at `limit`.
 */
export function pickNewestNailSets(
  products: ShopifyProduct[],
  limit: number,
  excludeIds: readonly string[] = [],
): ShopifyProduct[] {
  const excluded = new Set(excludeIds);
  return products
    .filter(
      (p) =>
        !excluded.has(p.id) &&
        classifyProduct({ handle: p.handle, isGiftCard: p.isGiftCard ?? false }) === "nail",
    )
    .slice(0, limit);
}
