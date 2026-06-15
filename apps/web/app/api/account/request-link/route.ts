// Passwordless login: email a fresh magic link IF the address has designs.
// Always responds {ok:true} — never reveal whether an account exists.
import { listSessionIds } from "@/lib/customize/account";
import { sendMagicLink } from "@/lib/customize/email";
import { magicLinkUrl } from "@/lib/customize/auth";
import { clientIp, rateLimited } from "@/lib/customize/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(`reqlink:${clientIp(req)}`, 5)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }
  let body: { email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: true });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return Response.json({ ok: true });
  try {
    const ids = await listSessionIds(email);
    if (ids.length) {
      await sendMagicLink(email, magicLinkUrl(email, "/account/designs"));
    }
  } catch {
    // swallow — uniform response regardless
  }
  return Response.json({ ok: true });
}
