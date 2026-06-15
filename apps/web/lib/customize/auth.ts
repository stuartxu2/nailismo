// Stateless passwordless auth for the Customize studio. A magic-link token and
// the login cookie share one HMAC-signed format: base64url(JSON{e,x}).sig.
// No storage — the signature is the proof. Server-only (reads the secret).

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "nm_acct";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days for both link and cookie

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};

function secret(): string {
  return process.env.CUSTOMIZE_AUTH_SECRET ?? "";
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function signToken(email: string, ttlSeconds: number): string {
  const payload = {
    e: email.trim().toLowerCase(),
    x: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${p}.${sign(p)}`;
}

/** Returns the email if the token is valid + unexpired, else null. */
export function verifyToken(token: string): string | null {
  if (!secret() || !token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(p);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(p, "base64url").toString()) as {
      e?: unknown;
      x?: unknown;
    };
    if (typeof e !== "string" || typeof x !== "number") return null;
    if (Math.floor(Date.now() / 1000) > x) return null;
    return e;
  } catch {
    return null;
  }
}

export function sessionCookieValue(email: string): string {
  return signToken(email, TTL_SECONDS);
}

/** Absolute magic-link URL that lands on /account/verify and then `next`. */
export function magicLinkUrl(email: string, next: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";
  const u = new URL("/account/verify", base);
  u.searchParams.set("token", signToken(email, TTL_SECONDS));
  u.searchParams.set("next", next);
  return u.toString();
}

/** Read the logged-in email from the signed cookie, or null. (Server only.) */
export async function readSessionEmail(): Promise<string | null> {
  const v = (await cookies()).get(SESSION_COOKIE)?.value;
  return v ? verifyToken(v) : null;
}
