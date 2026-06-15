// Server-only Stripe client for the $2 design deposit.
//
// The deposit is charged inline (Stripe), reimbursed later via a Shopify $2-off
// code so the $69 hosted checkout nets to $69. Never log key values.

import Stripe from "stripe";

export class StripeConfigError extends Error {}

/** $2 design deposit, in cents. */
export const DEPOSIT_AMOUNT_CENTS = 200;

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeConfigError("STRIPE_SECRET_KEY not configured");
  _stripe = new Stripe(key);
  return _stripe;
}

/**
 * Create the $2 PaymentIntent for a session. `automatic_payment_methods` lets
 * the Payment Element surface Apple/Google Pay + cards. sessionId rides in
 * metadata so the webhook can tie the charge back to the session.
 */
export async function createDepositIntent(
  sessionId: string,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const pi = await stripe().paymentIntents.create({
    amount: DEPOSIT_AMOUNT_CENTS,
    currency: "usd",
    description: "Nailismo Customize-to-Order design deposit",
    metadata: { sessionId },
    automatic_payment_methods: { enabled: true },
  });
  if (!pi.client_secret) throw new Error("PaymentIntent missing client_secret");
  return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
}

/** Refund the $2 deposit (used when all 3 generations fail). */
export async function refundDeposit(paymentIntentId: string): Promise<void> {
  await stripe().refunds.create({ payment_intent: paymentIntentId });
}

/** Verify + parse a Stripe webhook from the raw request body. Throws on any mismatch. */
export function constructWebhookEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new StripeConfigError("STRIPE_WEBHOOK_SECRET not configured");
  if (!signature) throw new Error("missing stripe-signature header");
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}
