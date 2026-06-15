import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("../shopify/admin", () => ({ adminFetch }));

import { applyPromo, PromoError } from "./promo";

/** Build a codeDiscountNodeByCode lookup result. */
function node(codeDiscount: unknown) {
  return { codeDiscountNodeByCode: codeDiscount === null ? null : { codeDiscount } };
}
const percentage = (p: number, status = "ACTIVE") => ({
  __typename: "DiscountCodeBasic",
  status,
  customerGets: { value: { __typename: "DiscountPercentage", percentage: p } },
});
const amount = (dollars: string, status = "ACTIVE") => ({
  __typename: "DiscountCodeBasic",
  status,
  customerGets: { value: { __typename: "DiscountAmount", amount: { amount: dollars } } },
});

beforeEach(() => adminFetch.mockReset());

describe("applyPromo", () => {
  it("rejects an empty code without hitting the API", async () => {
    await expect(applyPromo("   ")).rejects.toBeInstanceOf(PromoError);
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("rejects an unknown code", async () => {
    adminFetch.mockResolvedValueOnce(node(null));
    await expect(applyPromo("NOPE")).rejects.toThrow(/isn’t valid/);
  });

  it("rejects a non-basic discount (e.g. free shipping)", async () => {
    adminFetch.mockResolvedValueOnce(node({ __typename: "DiscountCodeFreeShipping" }));
    await expect(applyPromo("SHIP")).rejects.toThrow(/can’t be used here/);
  });

  it("rejects an inactive code", async () => {
    adminFetch.mockResolvedValueOnce(node(percentage(1, "EXPIRED")));
    await expect(applyPromo("OLD")).rejects.toThrow(/isn’t active/);
  });

  it("trims the code before lookup", async () => {
    adminFetch.mockResolvedValueOnce(node(percentage(0.5)));
    const r = await applyPromo("  HALF  ");
    expect(r.code).toBe("HALF");
    expect(adminFetch.mock.calls[0][1]).toEqual({ code: "HALF" });
  });

  it("100% off → free preview", async () => {
    adminFetch.mockResolvedValueOnce(node(percentage(1)));
    expect(await applyPromo("FREE")).toEqual({ code: "FREE", amountCents: 0, free: true });
  });

  it("50% off → pays $1", async () => {
    adminFetch.mockResolvedValueOnce(node(percentage(0.5)));
    expect(await applyPromo("HALF")).toEqual({ code: "HALF", amountCents: 100, free: false });
  });

  it("90% off → 20¢ remainder is below Stripe minimum → free", async () => {
    adminFetch.mockResolvedValueOnce(node(percentage(0.9)));
    expect(await applyPromo("DEEP")).toEqual({ code: "DEEP", amountCents: 0, free: true });
  });

  it("fixed $1 off → pays $1", async () => {
    adminFetch.mockResolvedValueOnce(node(amount("1.0")));
    expect(await applyPromo("BUCK")).toEqual({ code: "BUCK", amountCents: 100, free: false });
  });

  it("fixed amount ≥ $2 → free (clamped, never negative)", async () => {
    adminFetch.mockResolvedValueOnce(node(amount("5.0")));
    expect(await applyPromo("BIG")).toEqual({ code: "BIG", amountCents: 0, free: true });
  });
});
