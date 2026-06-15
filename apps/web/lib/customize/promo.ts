// Validate a Shopify-admin discount code against the $2 design-preview deposit.
//
// The $2 is a raw Stripe charge, not a Shopify checkout, so Shopify never sees
// (or redeems) the code here — we look it up via the Admin API, read its value,
// and compute what the customer actually pays. Only DiscountCodeBasic codes that
// are a percentage or a fixed amount apply; BXGY / free-shipping / app discounts
// don't map onto a flat $2 and are rejected. Usage limits are NOT enforced (no
// Shopify order is created at this step) — we honor active status + dates only.

import { adminFetch } from "../shopify/admin";
import { DEPOSIT_AMOUNT_CENTS } from "./stripe";

/** Stripe's minimum USD charge. A remainder below this is treated as free. */
const STRIPE_MIN_CENTS = 50;

/** User-safe validation failure — its message is shown to the customer verbatim. */
export class PromoError extends Error {}

export type PromoResult = {
  /** The matched code (trimmed). */
  code: string;
  /** What the customer pays after the promo, in cents (>= 0). */
  amountCents: number;
  /** True when the deposit nets to $0 — skip Stripe and generate directly. */
  free: boolean;
};

const LOOKUP = /* GraphQL */ `
  query PromoByCode($code: String!) {
    codeDiscountNodeByCode(code: $code) {
      codeDiscount {
        __typename
        ... on DiscountCodeBasic {
          status
          customerGets {
            value {
              __typename
              ... on DiscountPercentage { percentage }
              ... on DiscountAmount { amount { amount } }
            }
          }
        }
      }
    }
  }
`;

type GetsValue =
  | { __typename: "DiscountPercentage"; percentage: number }
  | { __typename: "DiscountAmount"; amount: { amount: string } }
  | { __typename: string };

type LookupResult = {
  codeDiscountNodeByCode: {
    codeDiscount:
      | { __typename: "DiscountCodeBasic"; status: string; customerGets: { value: GetsValue } }
      | { __typename: string }
      | null;
  } | null;
};

/**
 * Validate `rawCode` against the $2 deposit. Returns what the customer pays, or
 * throws `PromoError` with a customer-facing message when the code is unusable.
 */
export async function applyPromo(rawCode: string): Promise<PromoResult> {
  const code = rawCode.trim();
  if (!code) throw new PromoError("Enter a code.");

  const data = await adminFetch<LookupResult>(LOOKUP, { code });
  const node = data.codeDiscountNodeByCode?.codeDiscount;
  if (!node) throw new PromoError("That code isn’t valid.");
  if (node.__typename !== "DiscountCodeBasic") {
    throw new PromoError("That kind of code can’t be used here.");
  }

  const basic = node as { status: string; customerGets: { value: GetsValue } };
  if (basic.status !== "ACTIVE") throw new PromoError("That code isn’t active right now.");

  const value = basic.customerGets.value;
  let discountCents: number;
  if (value.__typename === "DiscountPercentage") {
    // Shopify returns percentage as a 0..1 fraction (0.5 = 50%).
    discountCents = Math.round(DEPOSIT_AMOUNT_CENTS * (value as { percentage: number }).percentage);
  } else if (value.__typename === "DiscountAmount") {
    discountCents = Math.round(parseFloat((value as { amount: { amount: string } }).amount.amount) * 100);
  } else {
    throw new PromoError("That kind of code can’t be used here.");
  }

  let amountCents = Math.max(0, DEPOSIT_AMOUNT_CENTS - discountCents);
  // Can't charge below Stripe's minimum — a tiny remainder becomes a free preview.
  if (amountCents > 0 && amountCents < STRIPE_MIN_CENTS) amountCents = 0;

  return { code, amountCents, free: amountCents === 0 };
}
