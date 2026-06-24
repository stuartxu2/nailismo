import { describe, it, expect } from "vitest";
import { add, has, remove, removeMany, type FavItem } from "./favorites";

function item(handle: string): FavItem {
  return {
    id: `gid://shopify/Product/${handle}`,
    handle,
    title: handle,
    image: null,
    price: "17.99",
    currency: "USD",
    variantId: `gid://shopify/ProductVariant/${handle}`,
    available: true,
  };
}

describe("favorites pure helpers", () => {
  it("has() detects membership by handle", () => {
    const list = [item("noir"), item("milk")];
    expect(has(list, "milk")).toBe(true);
    expect(has(list, "sky")).toBe(false);
  });

  it("add() appends a new item", () => {
    const next = add([item("noir")], item("milk"));
    expect(next.map((f) => f.handle)).toEqual(["noir", "milk"]);
  });

  it("add() de-dupes by handle, replacing the existing entry", () => {
    const updated = { ...item("noir"), title: "Noir (restocked)" };
    const next = add([item("noir"), item("milk")], updated);
    expect(next).toHaveLength(2);
    expect(next.find((f) => f.handle === "noir")?.title).toBe("Noir (restocked)");
  });

  it("add() does not mutate the input list", () => {
    const list = [item("noir")];
    add(list, item("milk"));
    expect(list).toHaveLength(1);
  });

  it("remove() drops a single handle", () => {
    const next = remove([item("noir"), item("milk")], "noir");
    expect(next.map((f) => f.handle)).toEqual(["milk"]);
  });

  it("removeMany() drops every listed handle and keeps the rest", () => {
    const list = [item("noir"), item("milk"), item("sky"), item("rose")];
    const next = removeMany(list, ["milk", "rose"]);
    expect(next.map((f) => f.handle)).toEqual(["noir", "sky"]);
  });

  it("removeMany() with no handles is a no-op clone", () => {
    const list = [item("noir")];
    expect(removeMany(list, [])).toEqual(list);
  });
});
