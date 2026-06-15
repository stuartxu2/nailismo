import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { create, constructEvent, refundCreate } = vi.hoisted(() => ({
  create: vi.fn(),
  constructEvent: vi.fn(),
  refundCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    paymentIntents = { create };
    webhooks = { constructEvent };
    refunds = { create: refundCreate };
  },
}));

import {
  createDepositIntent,
  constructWebhookEvent,
  refundDeposit,
  DEPOSIT_AMOUNT_CENTS,
  StripeConfigError,
} from "./stripe";

beforeEach(() => {
  create.mockReset();
  constructEvent.mockReset();
  refundCreate.mockReset();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
});
afterEach(() => vi.unstubAllEnvs());

describe("createDepositIntent", () => {
  it("charges 200¢ USD with sessionId metadata + wallets enabled", async () => {
    create.mockResolvedValueOnce({ id: "pi_1", client_secret: "cs_1" });
    const out = await createDepositIntent("sess-1");
    expect(out).toEqual({ clientSecret: "cs_1", paymentIntentId: "pi_1" });
    expect(DEPOSIT_AMOUNT_CENTS).toBe(200);
    const args = create.mock.calls[0][0];
    expect(args.amount).toBe(200);
    expect(args.currency).toBe("usd");
    expect(args.metadata).toEqual({ sessionId: "sess-1" });
    expect(args.automatic_payment_methods).toEqual({ enabled: true });
  });

  it("throws if Stripe returns no client_secret", async () => {
    create.mockResolvedValueOnce({ id: "pi_2", client_secret: null });
    await expect(createDepositIntent("s")).rejects.toThrow(/client_secret/);
  });
});

describe("refundDeposit", () => {
  it("refunds the PaymentIntent", async () => {
    refundCreate.mockResolvedValueOnce({ id: "re_1" });
    await refundDeposit("pi_9");
    expect(refundCreate).toHaveBeenCalledWith({ payment_intent: "pi_9" });
  });
});

describe("constructWebhookEvent", () => {
  it("delegates verification to the Stripe SDK", () => {
    constructEvent.mockReturnValueOnce({ type: "payment_intent.succeeded" });
    const ev = constructWebhookEvent("raw", "sig");
    expect(ev.type).toBe("payment_intent.succeeded");
    expect(constructEvent).toHaveBeenCalledWith("raw", "sig", "whsec_x");
  });

  it("rejects a missing signature header", () => {
    expect(() => constructWebhookEvent("raw", null)).toThrow(/signature/);
  });

  it("throws when the webhook secret is unset", () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(() => constructWebhookEvent("raw", "sig")).toThrow(StripeConfigError);
  });
});
