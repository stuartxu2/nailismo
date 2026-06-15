import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/customize/session", () => ({ getSession }));

import { GET } from "./route";

const ctx = (sessionId: string) => ({ params: Promise.resolve({ sessionId }) });
const req = new Request("http://localhost/api/customize/status/s1");

beforeEach(() => getSession.mockReset());

describe("GET /api/customize/status/[sessionId]", () => {
  it("404s for an unknown session", async () => {
    getSession.mockResolvedValueOnce(null);
    expect((await GET(req, ctx("nope"))).status).toBe(404);
  });

  it("returns status + per-slot jobs", async () => {
    getSession.mockResolvedValueOnce({
      status: "ready",
      jobs: [
        { seed: 101, status: "ready", resultUrl: "https://blob/0.png" },
        { seed: 202, status: "failed" },
      ],
    });
    const res = await GET(req, ctx("s1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ready",
      jobs: [
        { status: "ready", resultUrl: "https://blob/0.png" },
        { status: "failed", resultUrl: undefined },
      ],
    });
  });
});
