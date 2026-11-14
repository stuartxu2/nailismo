import { describe, it, expect } from "vitest";
import { COLLECTION_BY_HANDLE_QUERY } from "./queries";

describe("COLLECTION_BY_HANDLE_QUERY", () => {
  // Cart "Complete your 3-pack" tops up from Best Sellers through this query;
  // pickSuggestions drops products without an in-stock first variant and the
  // Add button needs its id, so the collection's products must carry both.
  it("selects each product's first variant id and stock", () => {
    const products = COLLECTION_BY_HANDLE_QUERY.slice(COLLECTION_BY_HANDLE_QUERY.indexOf("products("));
    expect(products).toMatch(/variants\(first: 1\)\s*\{\s*nodes\s*\{\s*id\s+availableForSale\s*\}/);
  });
});
