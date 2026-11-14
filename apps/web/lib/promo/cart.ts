import type { ShopifyCart, ShopifyCartLine, ShopifyProduct } from "@/lib/shopify/types";
import { BUNDLE_SIZE, isBundleEligible } from "./holiday";

/** Number of bundle-eligible sets in the cart, quantity-weighted. */
export function countEligibleSets(lines: ShopifyCartLine[]): number {
  return lines.reduce(
    (n, l) => (isBundleEligible(l.merchandise.product.tags) ? n + l.quantity : n),
    0,
  );
}

/** Total discount applied to the cart (cart-level + line-level allocations). */
export function bundleSavings(cart: ShopifyCart): number {
  const sum = (allocs: ShopifyCart["discountAllocations"]) =>
    allocs.reduce((n, a) => n + Number(a.discountedAmount.amount), 0);
  return sum(cart.discountAllocations) + cart.lines.nodes.reduce((n, l) => n + sum(l.discountAllocations), 0);
}

/** Copy nudging the shopper to the next complete 3-pack; null when nothing to say. */
export function bundleNudge(count: number): string | null {
  const need = (BUNDLE_SIZE - (count % BUNDLE_SIZE)) % BUNDLE_SIZE;
  if (count === 0 || need === 0) return null;
  const sets = need === 1 ? "1 more set" : `${need} more sets`;
  return count < BUNDLE_SIZE ? `Add ${sets} — get 3 for $45` : `Add ${sets} for another 3-pack`;
}

/** Eligible, in-stock suggestions not already in the cart, input order kept. */
export function pickSuggestions(
  candidates: ShopifyProduct[],
  inCartHandles: Set<string>,
  limit: number,
): ShopifyProduct[] {
  return candidates
    .filter(
      (p) =>
        !inCartHandles.has(p.handle) &&
        isBundleEligible(p.tags) &&
        Boolean(p.variants?.nodes[0]?.availableForSale),
    )
    .slice(0, limit);
}

/** Savings shown under the Total as already included, so the summary never
 *  reads like a second subtraction (line-level discounts are already inside
 *  Shopify's subtotal). Null below one cent. */
export function savingsNote(savings: number): string | null {
  const cents = Math.round(savings * 100);
  return cents > 0 ? `Includes $${(cents / 100).toFixed(2)} off` : null;
}

/** Heading for the cart's set suggestions, by how many eligible sets are in the bag. */
export function suggestionsHeading(count: number): string {
  if (count === 0) return "Build a 3-pack";
  return count % BUNDLE_SIZE === 0 ? "Start another 3-pack" : "Complete your 3-pack";
}
