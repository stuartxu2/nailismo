// Stripe webhook. Verifies the signature over the RAW body, then on a
// successful deposit moves the session into `generating`. The generation
// itself (Phase 4) is triggered from here so it can never run without payment.

import { after } from "next/server";
import { constructWebhookEvent } from "@/lib/customize/stripe";
import { getSession, transitionSession } from "@/lib/customize/session";
import { startGeneration } from "@/lib/customize/generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generation runs post-response via after(); give it room beyond Stripe's ~20s.
export const maxDuration = 120;

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch {
    // Bad/missing signature or misconfig — treat the body as untrusted.
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as { id: string; metadata?: Record<string, string> | null };
    const sessionId = pi.metadata?.sessionId;
    if (sessionId) {
      const session = await getSession(sessionId);
      // Idempotent: only advance from pending_payment, so retries are no-ops.
      if (session && session.status === "pending_payment") {
        await transitionSession(sessionId, "generating", { paymentIntentId: pi.id });
        // Respond fast; run the ~25s generation after the response so Stripe
        // doesn't time out and retry.
        after(() => startGeneration(sessionId));
      }
    }
  }

  return Response.json({ received: true });
}
