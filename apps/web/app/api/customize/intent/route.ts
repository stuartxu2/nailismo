// Step 2: create the $2 Stripe PaymentIntent for a pending session and return
// its client secret for the Payment Element. Generation is NOT triggered here —
// that happens server-side from the Stripe webhook once the charge succeeds.

import { getSession, upsertSession } from "@/lib/customize/session";
import { createDepositIntent } from "@/lib/customize/stripe";
import { clientIp, rateLimited } from "@/lib/customize/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(`intent:${clientIp(req)}`, 20)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  let body: { sessionId?: unknown };
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

  const { clientSecret, paymentIntentId } = await createDepositIntent(sessionId);
  await upsertSession({ sessionId, paymentIntentId });

  return Response.json({ clientSecret });
}
