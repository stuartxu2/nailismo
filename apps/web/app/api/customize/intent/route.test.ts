import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSession, upsertSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsertSession: vi.fn(),
}));
const { createDepositIntent } = vi.hoisted(() => ({ createDepositIntent: vi.fn() }));

vi.mock("@/lib/customize/session", () => ({ getSession, upsertSession }));
vi.mock("@/lib/customize/stripe", () => ({ createDepositIntent }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/customize/intent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getSession.mockReset();
  upsertSession.mockReset();
  createDepositIntent.mockReset();
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

  it("creates the deposit intent and stores the PaymentIntent id", async () => {
    getSession.mockResolvedValueOnce({ status: "pending_payment" });
    createDepositIntent.mockResolvedValueOnce({ clientSecret: "cs_1", paymentIntentId: "pi_1" });
    const res = await POST(req({ sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientSecret: "cs_1" });
    expect(createDepositIntent).toHaveBeenCalledWith("s1");
    expect(upsertSession).toHaveBeenCalledWith({ sessionId: "s1", paymentIntentId: "pi_1" });
  });
});
