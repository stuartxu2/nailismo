import { describe, it, expect } from "vitest";
import { bundleNudge, bundleSavings, countEligibleSets, pickSuggestions, savingsNote, suggestionsHeading } from "./cart";
import type { ShopifyCart, ShopifyCartLine, ShopifyProduct } from "@/lib/shopify/types";

const money = (amount: string) => ({ amount, currencyCode: "USD" });

function line(handle: string, tags: string[], quantity = 1, allocations: string[] = []): ShopifyCartLine {
  return {
    id: `line-${handle}`,
    quantity,
    cost: { totalAmount: money("17.99") },
    discountAllocations: allocations.map((a) => ({ discountedAmount: money(a) })),
    merchandise: {
      id: `variant-${handle}`,
      title: "M",
      image: null,
      product: { id: `product-${handle}`, handle, title: handle, tags },
      price: money("17.99"),
      selectedOptions: [],
    },
  };
}

function cart(lines: ShopifyCartLine[], cartAllocations: string[] = []): ShopifyCart {
  return {
    id: "cart",
    checkoutUrl: "https://example.com",
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    cost: { subtotalAmount: money("0"), totalAmount: money("0") },
    discountAllocations: cartAllocations.map((a) => ({ discountedAmount: money(a) })),
    lines: { nodes: lines },
  };
}

function product(handle: string, tags: string[], available = true): ShopifyProduct {
  return {
    id: `product-${handle}`,
    title: handle,
    handle,
    productType: "",
    tags,
    featuredImage: null,
    priceRange: { minVariantPrice: money("17.99") },
    variants: { nodes: [{ id: `variant-${handle}`, availableForSale: available }] },
  };
}

describe("countEligibleSets", () => {
  it("weights by quantity", () => {
    expect(countEligibleSets([line("a", ["Nail Set"], 3)])).toBe(3);
  });

  it("ignores gift cards and glue", () => {
    const lines = [
      line("nailismo-gift-card", []),
      line("nail-glue", []),
      line("a", ["Nail Set"]),
      line("b", ["Nail Set", "Blue"]),
    ];
    expect(countEligibleSets(lines)).toBe(2);
  });
});

describe("bundleSavings", () => {
  it("sums cart-level and line-level allocations", () => {
    const c = cart([line("a", ["Nail Set"], 1, ["2.50"]), line("b", ["Nail Set"], 1, ["2.50"])], ["3.00"]);
    expect(bundleSavings(c)).toBeCloseTo(8.0, 2);
  });

  it("is 0 with no allocations", () => {
    expect(bundleSavings(cart([line("a", ["Nail Set"])]))).toBe(0);
  });
});

describe("bundleNudge", () => {
  it.each([
    [0, null],
    [1, "Add 2 more sets — get 3 for $45"],
    [2, "Add 1 more set — get 3 for $45"],
    [3, null],
    [4, "Add 2 more sets for another 3-pack"],
    [5, "Add 1 more set for another 3-pack"],
    [6, null],
  ])("count %i → %s", (count, expected) => {
    expect(bundleNudge(count)).toBe(expected);
  });
});

describe("pickSuggestions", () => {
  it("drops in-cart, non-Nail-Set and unavailable items, keeps order, caps at limit", () => {
    const candidates = [
      product("in-cart", ["Nail Set"]),
      product("glue", []),
      product("sold-out", ["Nail Set"], false),
      product("one", ["Nail Set"]),
      product("two", ["Nail Set"]),
      product("three", ["Nail Set"]),
    ];
    const picked = pickSuggestions(candidates, new Set(["in-cart"]), 2);
    expect(picked.map((p) => p.handle)).toEqual(["one", "two"]);
  });
});

describe("savingsNote", () => {
  it("states the discount as already included in the total", () => {
    expect(savingsNote(8.97)).toBe("Includes $8.97 off");
    expect(savingsNote(17.94)).toBe("Includes $17.94 off");
  });

  it("says nothing when there is no real saving", () => {
    expect(savingsNote(0)).toBeNull();
    expect(savingsNote(0.004)).toBeNull();
  });
});

describe("suggestionsHeading", () => {
  it("builds a first 3-pack from an empty bag", () => {
    expect(suggestionsHeading(0)).toBe("Build a 3-pack");
  });

  it("completes a partial 3-pack", () => {
    expect(suggestionsHeading(1)).toBe("Complete your 3-pack");
    expect(suggestionsHeading(2)).toBe("Complete your 3-pack");
    expect(suggestionsHeading(5)).toBe("Complete your 3-pack");
  });

  it("starts another 3-pack when the bag holds only full packs", () => {
    expect(suggestionsHeading(3)).toBe("Start another 3-pack");
    expect(suggestionsHeading(6)).toBe("Start another 3-pack");
  });
});
