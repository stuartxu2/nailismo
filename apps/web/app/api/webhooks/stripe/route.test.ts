import { describe, it, expect, vi, beforeEach } from "vitest";

const { constructWebhookEvent } = vi.hoisted(() => ({ constructWebhookEvent: vi.fn() }));
const { getSession, transitionSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  transitionSession: vi.fn(),
}));

const { startGeneration } = vi.hoisted(() => ({ startGeneration: vi.fn() }));

vi.mock("@/lib/customize/stripe", () => ({
  constructWebhookEvent,
  StripeConfigError: class extends Error {},
}));
vi.mock("@/lib/customize/session", () => ({ getSession, transitionSession }));
vi.mock("@/lib/customize/generation", () => ({ startGeneration }));
// after() runs its callback synchronously in tests.
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));

import { POST } from "./route";

function req(body = "raw", sig: string | null = "sig") {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: sig ? { "stripe-signature": sig } : {},
  });
}

beforeEach(() => {
  constructWebhookEvent.mockReset();
  getSession.mockReset();
  transitionSession.mockReset();
  startGeneration.mockReset();
});

describe("POST /api/webhooks/stripe", () => {
  it("rejects an invalid signature with 400 and does no work", async () => {
    constructWebhookEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(transitionSession).not.toHaveBeenCalled();
  });

  it("advances a pending session to generating on payment_intent.succeeded", async () => {
    constructWebhookEvent.mockReturnValueOnce({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", metadata: { sessionId: "s1" } } },
    });
    getSession.mockResolvedValueOnce({ status: "pending_payment" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(transitionSession).toHaveBeenCalledWith("s1", "generating", { paymentIntentId: "pi_1" });
    expect(startGeneration).toHaveBeenCalledWith("s1");
  });

  it("is idempotent — already-generating session is left alone", async () => {
    constructWebhookEvent.mockReturnValueOnce({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", metadata: { sessionId: "s1" } } },
    });
    getSession.mockResolvedValueOnce({ status: "generating" });
    await POST(req());
    expect(transitionSession).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types", async () => {
    constructWebhookEvent.mockReturnValueOnce({ type: "charge.refunded", data: { object: {} } });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(getSession).not.toHaveBeenCalled();
  });
});
