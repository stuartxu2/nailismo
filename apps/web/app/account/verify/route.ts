// Magic-link landing: verify the token, set the login cookie, redirect to `next`.
import { NextResponse } from "next/server";
import { verifyToken, sessionCookieValue, cookieOptions, SESSION_COOKIE } from "@/lib/customize/auth";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const email = verifyToken(url.searchParams.get("token") ?? "");
  if (!email) {
    return NextResponse.redirect(new URL("/account/login?error=expired", base));
  }
  const nextParam = url.searchParams.get("next") || "/account/designs";
  // Open-redirect guard: only same-site relative paths.
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account/designs";
  const res = NextResponse.redirect(new URL(safeNext, base));
  res.cookies.set(SESSION_COOKIE, sessionCookieValue(email), cookieOptions);
  return res;
}
