// Step 2: create the $2 Stripe PaymentIntent for a pending session and return
// its client secret for the Payment Element. Generation is NOT triggered here —
// that happens server-side from the Stripe webhook once the charge succeeds.
//
// Exception: an optional Shopify-admin promo code can reduce the deposit. If it
// nets to $0 there's no Stripe charge (and thus no webhook), so this route fires
// generation directly — guarded by the server-side promo validation + the
// pending_payment transition, so it can't run without a real, active code.

import { after } from "next/server";
import { getSession, upsertSession, transitionSession } from "@/lib/customize/session";
import { createDepositIntent, DEPOSIT_AMOUNT_CENTS } from "@/lib/customize/stripe";
import { applyPromo, PromoError } from "@/lib/customize/promo";
import { startGeneration } from "@/lib/customize/generation";
import { clientIp, rateLimited } from "@/lib/customize/ratelimit";

export const runtime = "nodejs";
// The free-promo path runs generation post-response via after(); give it room.
export const maxDuration = 120;

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(`intent:${clientIp(req)}`, 20)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  let body: { sessionId?: unknown; promoCode?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const sessionId = body.sessionId;
  if (typeof sessionId !== "string" || !sessionId) {
    return Response.json({ error: "missing sessionId" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return Response.json({ error: "unknown session" }, { status: 404 });
  }
  if (session.status !== "pending_payment") {
    return Response.json({ error: "session not awaiting payment" }, { status: 409 });
  }

  // Optional Shopify-admin promo applied to the $2 deposit.
  let amountCents = DEPOSIT_AMOUNT_CENTS;
  const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim() : "";
  if (promoCode) {
    try {
      amountCents = (await applyPromo(promoCode)).amountCents;
    } catch (e) {
      const msg = e instanceof PromoError ? e.message : "Couldn’t check that code — try again.";
      return Response.json({ error: msg }, { status: 400 });
    }
  }

  // Comped preview — no Stripe charge (and so no webhook). Mirror the webhook:
  // advance to generating and fire generation directly.
  if (amountCents === 0) {
    await transitionSession(sessionId, "generating");
    after(() => startGeneration(sessionId));
    return Response.json({ free: true });
  }

  const { clientSecret, paymentIntentId } = await createDepositIntent(sessionId, amountCents);
  await upsertSession({ sessionId, paymentIntentId });

  return Response.json({ clientSecret, amountCents });
}
