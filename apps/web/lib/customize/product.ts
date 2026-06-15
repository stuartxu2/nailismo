// The made-to-order "Custom Nail Set" product (created Phase 0, store n2kktm-sk).
// DRAFT until published to the Headless sales channel. Variant GIDs double as
// Storefront merchandise IDs.

export const CUSTOM_PRODUCT_ID = "gid://shopify/Product/7141942362161";

export const CUSTOM_VARIANTS = {
  S: "gid://shopify/ProductVariant/41046229581873",
  M: "gid://shopify/ProductVariant/41046229614641",
  L: "gid://shopify/ProductVariant/41046229647409",
  XL: "gid://shopify/ProductVariant/41046229680177",
} as const;

export type NailSize = keyof typeof CUSTOM_VARIANTS;

export function isNailSize(v: unknown): v is NailSize {
  return typeof v === "string" && v in CUSTOM_VARIANTS;
}
