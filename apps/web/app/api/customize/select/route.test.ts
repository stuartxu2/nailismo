import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSession, upsertSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsertSession: vi.fn(),
}));
const { mintDepositCode } = vi.hoisted(() => ({ mintDepositCode: vi.fn() }));
const { createCustomCheckout } = vi.hoisted(() => ({ createCustomCheckout: vi.fn() }));

vi.mock("@/lib/customize/session", () => ({ getSession, upsertSession }));
vi.mock("@/lib/customize/discount", () => ({ mintDepositCode }));
vi.mock("@/lib/customize/checkout", () => ({ createCustomCheckout }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/customize/select", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const READY = {
  status: "ready",
  paymentIntentId: "pi_1",
  jobs: [{ seed: 101, status: "ready", resultUrl: "https://blob/0.png" }],
};

beforeEach(() => {
  getSession.mockReset();
  upsertSession.mockReset();
  mintDepositCode.mockReset();
  createCustomCheckout.mockReset();
});

describe("POST /api/customize/select", () => {
  it("validates index and size", async () => {
    expect((await POST(req({ sessionId: "s", selectedIndex: -1, size: "S" }))).status).toBe(400);
    expect((await POST(req({ sessionId: "s", selectedIndex: 0, size: "XXL" }))).status).toBe(400);
  });

  it("404s for unknown session, 409 if not ready", async () => {
    getSession.mockResolvedValueOnce(null);
    expect((await POST(req({ sessionId: "s", selectedIndex: 0, size: "S" }))).status).toBe(404);
    getSession.mockResolvedValueOnce({ status: "generating", jobs: [] });
    expect((await POST(req({ sessionId: "s", selectedIndex: 0, size: "S" }))).status).toBe(409);
  });

  it("400s when the chosen slot isn't ready", async () => {
    getSession.mockResolvedValueOnce({ status: "ready", jobs: [{ seed: 101, status: "failed" }] });
    expect((await POST(req({ sessionId: "s", selectedIndex: 0, size: "S" }))).status).toBe(400);
  });

  it("mints a code, records selection, returns the checkout URL", async () => {
    getSession.mockResolvedValueOnce(READY);
    mintDepositCode.mockResolvedValueOnce("C2O-XYZ");
    createCustomCheckout.mockResolvedValueOnce("https://shop/checkout/abc");

    const res = await POST(req({ sessionId: "s1", selectedIndex: 0, size: "M" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checkoutUrl: "https://shop/checkout/abc" });

    expect(upsertSession).toHaveBeenCalledWith({
      sessionId: "s1",
      selectedIndex: 0,
      discountCode: "C2O-XYZ",
      status: "selected",
    });
    const arg = createCustomCheckout.mock.calls[0][0];
    expect(arg.variantId).toContain("ProductVariant/41046229614641"); // M
    expect(arg.discountCode).toBe("C2O-XYZ");
    expect(arg.attributes).toContainEqual({ key: "_design_url", value: "https://blob/0.png" });
    expect(arg.attributes).toContainEqual({ key: "_payment_intent", value: "pi_1" });
  });

  it("reuses an already-minted code without re-minting", async () => {
    getSession.mockResolvedValueOnce({ ...READY, status: "selected", discountCode: "C2O-OLD" });
    createCustomCheckout.mockResolvedValueOnce("https://shop/checkout/def");
    await POST(req({ sessionId: "s1", selectedIndex: 0, size: "S" }));
    expect(mintDepositCode).not.toHaveBeenCalled();
    expect(createCustomCheckout.mock.calls[0][0].discountCode).toBe("C2O-OLD");
  });
});
