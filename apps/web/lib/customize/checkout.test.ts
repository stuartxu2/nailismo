import { describe, it, expect, vi, beforeEach } from "vitest";

const { storefrontFetch } = vi.hoisted(() => ({ storefrontFetch: vi.fn() }));
vi.mock("../shopify/client", () => ({ storefrontFetch }));

import { createCustomCheckout } from "./checkout";

beforeEach(() => storefrontFetch.mockReset());

describe("createCustomCheckout", () => {
  it("creates a cart with the line attributes + discount and returns the URL", async () => {
    storefrontFetch.mockResolvedValueOnce({
      cartCreate: { cart: { checkoutUrl: "https://shop/checkout/abc" }, userErrors: [] },
    });
    const url = await createCustomCheckout({
      variantId: "gid://shopify/ProductVariant/1",
      attributes: [{ key: "_design_url", value: "https://blob/x.png" }],
      discountCode: "C2O-ABC",
    });
    expect(url).toBe("https://shop/checkout/abc");
    const vars = storefrontFetch.mock.calls[0][1];
    expect(vars.lines[0]).toEqual({
      merchandiseId: "gid://shopify/ProductVariant/1",
      quantity: 1,
      attributes: [{ key: "_design_url", value: "https://blob/x.png" }],
    });
    expect(vars.discountCodes).toEqual(["C2O-ABC"]);
  });

  it("omits discountCodes when none given", async () => {
    storefrontFetch.mockResolvedValueOnce({
      cartCreate: { cart: { checkoutUrl: "https://shop/c" }, userErrors: [] },
    });
    await createCustomCheckout({ variantId: "v", attributes: [] });
    expect(storefrontFetch.mock.calls[0][1].discountCodes).toEqual([]);
  });

  it("throws on userErrors", async () => {
    storefrontFetch.mockResolvedValueOnce({
      cartCreate: { cart: null, userErrors: [{ message: "nope" }] },
    });
    await expect(createCustomCheckout({ variantId: "v", attributes: [] })).rejects.toThrow(/nope/);
  });

  it("throws when no checkoutUrl comes back", async () => {
    storefrontFetch.mockResolvedValueOnce({ cartCreate: { cart: null, userErrors: [] } });
    await expect(createCustomCheckout({ variantId: "v", attributes: [] })).rejects.toThrow(/checkoutUrl/);
  });
});
