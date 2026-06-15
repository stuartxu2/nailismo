// Mint the single-use $2-off code that reimburses the design deposit at the $69
// checkout (net $69). Scoped to the Custom Nail Set product, usage limit 1.

import { adminFetch } from "../shopify/admin";
import { CUSTOM_PRODUCT_ID } from "./product";

const CREATE = /* GraphQL */ `
  mutation CreateDeposit($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field message code }
    }
  }
`;

/** Deterministic per-session code, so retries reuse the same one. */
export function depositCodeFor(sessionId: string): string {
  return `C2O-${sessionId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

type CreateResult = {
  discountCodeBasicCreate: { userErrors: Array<{ message: string }> };
};

export async function mintDepositCode(sessionId: string): Promise<string> {
  const code = depositCodeFor(sessionId);
  const data = await adminFetch<CreateResult>(CREATE, {
    basicCodeDiscount: {
      title: `Customize deposit credit ${sessionId}`,
      code,
      startsAt: new Date().toISOString(),
      usageLimit: 1,
      appliesOncePerCustomer: true,
      // `customerSelection` is deprecated in favor of `context` (a complex
      // DiscountContextInput) but remains functional; "all" = any buyer may use
      // this (single-use) code.
      customerSelection: { all: true },
      customerGets: {
        value: { discountAmount: { amount: "2.0", appliesOnEachItem: false } },
        items: { products: { productsToAdd: [CUSTOM_PRODUCT_ID] } },
      },
    },
  });
  const errs = data.discountCodeBasicCreate.userErrors;
  // Tolerate a re-mint of the same code (idempotent select retries).
  if (errs.length && !errs.some((e) => /taken|exists/i.test(e.message))) {
    throw new Error(`discountCodeBasicCreate: ${errs.map((e) => e.message).join("; ")}`);
  }
  return code;
}
