import { describe, it, expect, vi, beforeEach } from "vitest";

const { listSessionIds } = vi.hoisted(() => ({ listSessionIds: vi.fn() }));
const { sendMagicLink } = vi.hoisted(() => ({ sendMagicLink: vi.fn() }));
vi.mock("@/lib/customize/account", () => ({ listSessionIds }));
vi.mock("@/lib/customize/email", () => ({ sendMagicLink }));

import { POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/account/request-link", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `1.2.3.${Math.random()}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.CUSTOMIZE_AUTH_SECRET = "s";
  listSessionIds.mockReset();
  sendMagicLink.mockReset();
});

describe("POST /api/account/request-link", () => {
  it("emails a link when the email has designs", async () => {
    listSessionIds.mockResolvedValueOnce(["s1"]);
    const res = await POST(post({ email: "a@b.com" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendMagicLink).toHaveBeenCalledTimes(1);
    expect(sendMagicLink.mock.calls[0][1]).toContain("/account/verify");
  });

  it("returns the same body but sends nothing when no designs exist", async () => {
    listSessionIds.mockResolvedValueOnce([]);
    const res = await POST(post({ email: "nobody@x.com" }));
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendMagicLink).not.toHaveBeenCalled();
  });

  it("returns ok for a missing/invalid email without sending", async () => {
    const res = await POST(post({}));
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendMagicLink).not.toHaveBeenCalled();
  });
});
