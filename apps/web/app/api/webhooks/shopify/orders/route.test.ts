import { describe, it, expect, vi, beforeEach } from "vitest";

const { verifyShopifyHmac } = vi.hoisted(() => ({ verifyShopifyHmac: vi.fn() }));
const { getSession, transitionSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  transitionSession: vi.fn(),
}));
const { refundDeposit } = vi.hoisted(() => ({ refundDeposit: vi.fn() }));

vi.mock("@/lib/shopify/webhook-verify", () => ({ verifyShopifyHmac }));
vi.mock("@/lib/customize/session", () => ({ getSession, transitionSession }));
vi.mock("@/lib/customize/stripe", () => ({ refundDeposit }));

import { POST } from "./route";

function orderReq(body: unknown) {
  return new Request("http://localhost/api/webhooks/shopify/orders", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-shopify-hmac-sha256": "sig" },
  });
}

const lineWith = (props: Record<string, string>) => ({
  line_items: [{ properties: Object.entries(props).map(([name, value]) => ({ name, value })) }],
});

beforeEach(() => {
  verifyShopifyHmac.mockReset().mockReturnValue(true);
  getSession.mockReset();
  transitionSession.mockReset();
  refundDeposit.mockReset();
});

describe("POST /api/webhooks/shopify/orders", () => {
  it("401s on a bad HMAC", async () => {
    verifyShopifyHmac.mockReturnValueOnce(false);
    expect((await POST(orderReq({}))).status).toBe(401);
  });

  it("ignores orders without a Customize session", async () => {
    const res = await POST(orderReq({ line_items: [{ properties: [] }] }));
    expect(res.status).toBe(200);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("marks ordered and does NOT refund when the $2-off applied", async () => {
    getSession.mockResolvedValueOnce({
      status: "selected",
      discountCode: "C2O-ABC",
      paymentIntentId: "pi_1",
    });
    await POST(
      orderReq({
        ...lineWith({ _session_id: "s1", _payment_intent: "pi_1" }),
        discount_codes: [{ code: "C2O-ABC" }],
      }),
    );
    expect(transitionSession).toHaveBeenCalledWith("s1", "ordered");
    expect(refundDeposit).not.toHaveBeenCalled();
  });

  it("refunds the $2 when the code was NOT applied", async () => {
    getSession.mockResolvedValueOnce({
      status: "selected",
      discountCode: "C2O-ABC",
      paymentIntentId: "pi_1",
    });
    await POST(orderReq({ ...lineWith({ _session_id: "s1" }), discount_codes: [] }));
    expect(transitionSession).toHaveBeenCalledWith("s1", "ordered");
    expect(refundDeposit).toHaveBeenCalledWith("pi_1");
  });
});
