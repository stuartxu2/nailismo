import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSession, upsertSession, transitionSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsertSession: vi.fn(),
  transitionSession: vi.fn(),
}));
const { createDepositIntent } = vi.hoisted(() => ({ createDepositIntent: vi.fn() }));
const { applyPromo } = vi.hoisted(() => ({ applyPromo: vi.fn() }));
const { startGeneration } = vi.hoisted(() => ({ startGeneration: vi.fn() }));

vi.mock("@/lib/customize/session", () => ({ getSession, upsertSession, transitionSession }));
vi.mock("@/lib/customize/stripe", () => ({ createDepositIntent, DEPOSIT_AMOUNT_CENTS: 200 }));
vi.mock("@/lib/customize/promo", () => ({ applyPromo, PromoError: class extends Error {} }));
vi.mock("@/lib/customize/generation", () => ({ startGeneration }));
// after() runs its callback synchronously in tests.
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));

import { POST } from "./route";
import { PromoError } from "@/lib/customize/promo";

function req(body: unknown) {
  return new Request("http://localhost/api/customize/intent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getSession.mockReset();
  upsertSession.mockReset();
  transitionSession.mockReset();
  createDepositIntent.mockReset();
  applyPromo.mockReset();
  startGeneration.mockReset();
});

describe("POST /api/customize/intent", () => {
  it("400s without a sessionId", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it("404s for an unknown session", async () => {
    getSession.mockResolvedValueOnce(null);
    expect((await POST(req({ sessionId: "nope" }))).status).toBe(404);
  });

  it("409s when the session isn't awaiting payment", async () => {
    getSession.mockResolvedValueOnce({ status: "generating" });
    expect((await POST(req({ sessionId: "s1" }))).status).toBe(409);
  });

  it("creates the full $2 deposit intent when no promo is given", async () => {
    getSession.mockResolvedValueOnce({ status: "pending_payment" });
    createDepositIntent.mockResolvedValueOnce({ clientSecret: "cs_1", paymentIntentId: "pi_1" });
    const res = await POST(req({ sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientSecret: "cs_1", amountCents: 200 });
    expect(createDepositIntent).toHaveBeenCalledWith("s1", 200);
    expect(upsertSession).toHaveBeenCalledWith({ sessionId: "s1", paymentIntentId: "pi_1" });
    expect(applyPromo).not.toHaveBeenCalled();
  });

  it("charges the reduced amount for a partial promo", async () => {
    getSession.mockResolvedValueOnce({ status: "pending_payment" });
    applyPromo.mockResolvedValueOnce({ code: "HALF", amountCents: 100, free: false });
    createDepositIntent.mockResolvedValueOnce({ clientSecret: "cs_2", paymentIntentId: "pi_2" });
    const res = await POST(req({ sessionId: "s1", promoCode: "HALF" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientSecret: "cs_2", amountCents: 100 });
    expect(createDepositIntent).toHaveBeenCalledWith("s1", 100);
  });

  it("skips Stripe and fires generation for a free promo", async () => {
    getSession.mockResolvedValueOnce({ status: "pending_payment" });
    applyPromo.mockResolvedValueOnce({ code: "FREE", amountCents: 0, free: true });
    const res = await POST(req({ sessionId: "s1", promoCode: "FREE" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ free: true });
    expect(transitionSession).toHaveBeenCalledWith("s1", "generating");
    expect(startGeneration).toHaveBeenCalledWith("s1");
    expect(createDepositIntent).not.toHaveBeenCalled();
  });

  it("400s with the promo's message when the code is invalid", async () => {
    getSession.mockResolvedValueOnce({ status: "pending_payment" });
    applyPromo.mockRejectedValueOnce(new PromoError("That code isn’t valid."));
    const res = await POST(req({ sessionId: "s1", promoCode: "NOPE" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/isn’t valid/);
    expect(createDepositIntent).not.toHaveBeenCalled();
    expect(transitionSession).not.toHaveBeenCalled();
  });
});
