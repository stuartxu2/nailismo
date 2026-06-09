import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Webhook receiver runs on Node.js (needs crypto + the raw request body for HMAC).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shopify signs app webhooks with the app's API secret key (the client secret).
const SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;

/**
 * Verify the Shopify HMAC over the *raw* request body. Returns false on any
 * mismatch or missing header — the body must be treated as untrusted until this
 * passes (per CLAUDE.md backend rules).
 */
function verifyHmac(rawBody: string, headerHmac: string | null): boolean {
  if (!SECRET || !headerHmac) return false;
  const digest = crypto.createHmac("sha256", SECRET).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(headerHmac);
  // timingSafeEqual throws if lengths differ; guard first.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!SECRET) {
    // Misconfiguration, not a client error — surface the missing key name only.
    console.error("shopify webhook: SHOPIFY_ADMIN_CLIENT_SECRET not set");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const headerHmac = req.headers.get("x-shopify-hmac-sha256");
  if (!verifyHmac(rawBody, headerHmac)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";

  // Pull the product handle when present so we can target its PDP precisely.
  let handle: string | undefined;
  try {
    handle = (JSON.parse(rawBody) as { handle?: string }).handle;
  } catch {
    // Non-JSON or unexpected payload — still revalidate the listing pages below.
  }

  // Any product mutation can change price/availability on these surfaces.
  if (handle) revalidatePath(`/product/${handle}`);
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/collections/[handle]", "page");
  revalidatePath("/feed/google.xml");

  console.log(`shopify webhook ok: topic=${topic} handle=${handle ?? "-"}`);
  return NextResponse.json({ ok: true });
}
