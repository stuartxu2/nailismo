import { describe, it, expect, beforeEach } from "vitest";
import { signToken, verifyToken, magicLinkUrl, sessionCookieValue } from "./auth";

beforeEach(() => {
  process.env.CUSTOMIZE_AUTH_SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
  process.env.NEXT_PUBLIC_SITE_URL = "https://nailismo.com";
});

describe("signToken / verifyToken", () => {
  it("round-trips the email (lowercased, trimmed)", () => {
    const t = signToken("  User@Example.com ", 60);
    expect(verifyToken(t)).toBe("user@example.com");
  });

  it("rejects an expired token", () => {
    const t = signToken("a@b.com", -1); // already expired
    expect(verifyToken(t)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const t = signToken("a@b.com", 60);
    const tampered = t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa");
    expect(verifyToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens and a missing secret", () => {
    expect(verifyToken("garbage")).toBeNull();
    expect(verifyToken("")).toBeNull();
    const t = signToken("a@b.com", 60);
    delete process.env.CUSTOMIZE_AUTH_SECRET;
    expect(verifyToken(t)).toBeNull();
  });
});

describe("magicLinkUrl", () => {
  it("builds an absolute /account/verify link with token + next", () => {
    const url = new URL(magicLinkUrl("a@b.com", "/customize/result/s1"));
    expect(url.origin + url.pathname).toBe("https://nailismo.com/account/verify");
    expect(url.searchParams.get("next")).toBe("/customize/result/s1");
    expect(verifyToken(url.searchParams.get("token")!)).toBe("a@b.com");
  });
});

describe("sessionCookieValue", () => {
  it("is a verifiable long-lived token", () => {
    expect(verifyToken(sessionCookieValue("a@b.com"))).toBe("a@b.com");
  });
});
