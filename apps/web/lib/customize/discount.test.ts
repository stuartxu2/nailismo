import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("../shopify/admin", () => ({ adminFetch }));

import { mintDepositCode, depositCodeFor } from "./discount";
import { CUSTOM_PRODUCT_ID } from "./product";

beforeEach(() => adminFetch.mockReset());

describe("depositCodeFor", () => {
  it("is deterministic, uppercase, hyphen-free body", () => {
    const code = depositCodeFor("a15e7fc5-9a38-45c1");
    expect(code).toBe("C2O-A15E7FC59A");
    expect(depositCodeFor("a15e7fc5-9a38-45c1")).toBe(code);
  });
});

describe("mintDepositCode", () => {
  it("creates a $2-off, single-use code scoped to the product", async () => {
    adminFetch.mockResolvedValueOnce({ discountCodeBasicCreate: { userErrors: [] } });
    const code = await mintDepositCode("sess-1");
    const input = adminFetch.mock.calls[0][1].basicCodeDiscount;
    expect(code).toMatch(/^C2O-/);
    expect(input.code).toBe(code);
    expect(input.usageLimit).toBe(1);
    expect(input.customerGets.value.discountAmount.amount).toBe("2.00");
    expect(input.customerGets.items.products.productsToAdd).toEqual([CUSTOM_PRODUCT_ID]);
  });

  it("credits a custom amount when the preview was discounted", async () => {
    adminFetch.mockResolvedValueOnce({ discountCodeBasicCreate: { userErrors: [] } });
    await mintDepositCode("sess-1", 1);
    expect(adminFetch.mock.calls[0][1].basicCodeDiscount.customerGets.value.discountAmount.amount).toBe(
      "1.00",
    );
  });

  it("tolerates a 'code taken' re-mint (idempotent)", async () => {
    adminFetch.mockResolvedValueOnce({
      discountCodeBasicCreate: { userErrors: [{ message: "Code has already been taken" }] },
    });
    await expect(mintDepositCode("sess-1")).resolves.toMatch(/^C2O-/);
  });

  it("throws on a real error", async () => {
    adminFetch.mockResolvedValueOnce({
      discountCodeBasicCreate: { userErrors: [{ message: "Something else" }] },
    });
    await expect(mintDepositCode("sess-1")).rejects.toThrow(/Something else/);
  });
});
