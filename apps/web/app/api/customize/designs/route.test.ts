import { describe, it, expect, vi, beforeEach } from "vitest";

const { storefrontFetch } = vi.hoisted(() => ({ storefrontFetch: vi.fn() }));
const { listSessionIds } = vi.hoisted(() => ({ listSessionIds: vi.fn() }));
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/shopify/client", () => ({ storefrontFetch }));
vi.mock("@/lib/customize/account", () => ({ listSessionIds }));
vi.mock("@/lib/customize/session", () => ({ getSession }));

import { GET } from "./route";

const reqWith = (token?: string) =>
  new Request("http://localhost/api/customize/designs", {
    headers: token ? { "x-shopify-customer-token": token } : {},
  });

beforeEach(() => {
  storefrontFetch.mockReset();
  listSessionIds.mockReset();
  getSession.mockReset();
});

describe("GET /api/customize/designs", () => {
  it("401s without a customer token", async () => {
    expect((await GET(reqWith())).status).toBe(401);
  });

  it("401s when the token resolves to no customer", async () => {
    storefrontFetch.mockResolvedValueOnce({ customer: null });
    expect((await GET(reqWith("bad"))).status).toBe(401);
  });

  it("returns design summaries for a valid token", async () => {
    storefrontFetch.mockResolvedValueOnce({ customer: { email: "A@x.com" } });
    listSessionIds.mockResolvedValueOnce(["s1", "s2"]);
    getSession.mockImplementation(async (id: string) =>
      id === "s1"
        ? { sessionId: "s1", status: "ready", jobs: [{ seed: 101, status: "ready", resultUrl: "https://b/0.png" }] }
        : { sessionId: "s2", status: "generating", jobs: [] },
    );

    const res = await GET(reqWith("good"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      designs: [
        { sessionId: "s1", status: "ready", thumbUrl: "https://b/0.png" },
        { sessionId: "s2", status: "generating", thumbUrl: undefined },
      ],
    });
    expect(listSessionIds).toHaveBeenCalledWith("A@x.com");
  });
});
