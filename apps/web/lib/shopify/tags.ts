import { BUNDLE_TAG } from "@/lib/promo/holiday";

// Operational tags that drive collections/discounts but mean nothing to a
// shopper (e.g. "Nail Set" = bundle eligibility, set by tools/shopify_nail_set_tag.py).
const INTERNAL_TAGS = new Set<string>([BUNDLE_TAG]);

/** Tags safe to show as chips / filters, original order kept. */
export function displayTags(tags: readonly string[]): string[] {
  return tags.filter((t) => !INTERNAL_TAGS.has(t));
}
