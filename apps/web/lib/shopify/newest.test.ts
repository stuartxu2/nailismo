import { describe, it, expect } from "vitest";
import { pickNewestNailSets } from "./newest";
import type { ShopifyProduct } from "./types";

function product(handle: string, extra: Partial<ShopifyProduct> = {}): ShopifyProduct {
  return {
    id: `gid://shopify/Product/${handle}`,
    title: handle,
    handle,
    productType: "",
    tags: [],
    featuredImage: null,
    priceRange: { minVariantPrice: { amount: "17.99", currencyCode: "USD" } },
    ...extra,
  };
}

describe("pickNewestNailSets", () => {
  it("keeps only nail sets, dropping gift cards, essentials and excluded ids", () => {
    const products = [
      product("sweater-weather"),
      product("custom-nail-set", { id: "gid://shopify/Product/CUSTOM" }),
      product("nailismo-gift-card", { isGiftCard: true }),
      product("nail-glue"),
      product("maple-szn"),
    ];
    const picked = pickNewestNailSets(products, 10, ["gid://shopify/Product/CUSTOM"]);
    expect(picked.map((p) => p.handle)).toEqual(["sweater-weather", "maple-szn"]);
  });

  it("preserves input (newest-first) order and caps at the limit", () => {
    const products = ["a", "b", "c", "d"].map((h) => product(h));
    expect(pickNewestNailSets(products, 3).map((p) => p.handle)).toEqual(["a", "b", "c"]);
  });
});
