import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { moderateImage } from "./moderation";

const fetchMock = vi.fn();
const ok = (content: string) =>
  ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) }) as unknown as Response;

beforeEach(() => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("moderateImage", () => {
  it("allows a safe image", async () => {
    fetchMock.mockResolvedValueOnce(ok('{"allowed":true,"reason":""}'));
    expect(await moderateImage("data:image/jpeg;base64,x")).toEqual({ allowed: true, reason: "" });
  });

  it("blocks an unsafe image with a reason", async () => {
    fetchMock.mockResolvedValueOnce(ok('{"allowed":false,"reason":"Please avoid photos of people."}'));
    const r = await moderateImage("data:image/jpeg;base64,x");
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/people/);
  });

  it("tolerates code-fenced JSON", async () => {
    fetchMock.mockResolvedValueOnce(ok('```json\n{"allowed":false,"reason":"nope"}\n```'));
    expect((await moderateImage("data:image/jpeg;base64,x")).allowed).toBe(false);
  });

  it("fails open on upstream error", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502 } as unknown as Response);
    expect((await moderateImage("x")).allowed).toBe(true);
  });

  it("fails open on bad JSON / timeout", async () => {
    fetchMock.mockResolvedValueOnce(ok("not json"));
    expect((await moderateImage("x")).allowed).toBe(true);
  });

  it("fails open when the gateway key is unset", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    expect((await moderateImage("x")).allowed).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
