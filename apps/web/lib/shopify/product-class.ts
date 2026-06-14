// Which PDP template a product renders with. Nail sets get the full product
// page (sizing, press-on guide, etc.); gift cards and care essentials get the
// leaner SimpleProductTemplate instead.
export type ProductClass = "nail" | "essential" | "gift";

// Handles in Shopify's "The Essentials" collection (glue, remover, …). Kept as
// a small inclusion list — same pattern as MENU_COLLECTION_HANDLES — because
// these products carry no productType/tags to key off. Add a handle here when a
// new care essential ships.
export const ESSENTIAL_HANDLES = new Set<string>(["nail-glue", "glue-remover"]);

export function classifyProduct(product: {
  handle: string;
  isGiftCard: boolean;
}): ProductClass {
  if (product.isGiftCard) return "gift";
  if (ESSENTIAL_HANDLES.has(product.handle)) return "essential";
  return "nail";
}
