// Shopify orders/paid reconciliation. Verifies the HMAC, then for an order that
// carries a Customize session (via the `_session_id` line-item property):
//  - marks the session `ordered`
//  - if the $2-off code did NOT apply (customer paid full $69), refunds the $2
//    Stripe deposit so the promise stays literally true (net $69).
//
// Register this topic via the webhook tool before it fires in production.

import { verifyShopifyHmac } from "@/lib/shopify/webhook-verify";
import { getSession, transitionSession } from "@/lib/customize/session";
import { refundDeposit } from "@/lib/customize/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderProp = { name: string; value: string };
type OrderLine = { properties?: OrderProp[] };
type OrderPayload = {
  line_items?: OrderLine[];
  discount_codes?: Array<{ code?: string }>;
};

function prop(lines: OrderLine[], key: string): string | undefined {
  for (const li of lines) {
    const hit = li.properties?.find((p) => p.name === key);
    if (hit?.value) return hit.value;
  }
  return undefined;
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  if (!verifyShopifyHmac(rawBody, req.headers.get("x-shopify-hmac-sha256"))) {
    return Response.json({ error: "invalid hmac" }, { status: 401 });
  }

  let order: OrderPayload;
  try {
    order = JSON.parse(rawBody) as OrderPayload;
  } catch {
    return Response.json({ ok: true }); // ack non-JSON; nothing to reconcile
  }

  const lines = order.line_items ?? [];
  const sessionId = prop(lines, "_session_id");
  if (!sessionId) return Response.json({ ok: true }); // not a Customize order

  const session = await getSession(sessionId);
  if (!session) return Response.json({ ok: true });

  // Mark ordered (idempotent: skip if already past selection).
  if (session.status === "selected" || session.status === "ready") {
    await transitionSession(sessionId, "ordered");
  }

  // Reconcile the deposit credit: if our code wasn't applied, refund the $2.
  const appliedCodes = (order.discount_codes ?? []).map((d) => (d.code ?? "").toUpperCase());
  const paymentIntentId = prop(lines, "_payment_intent") ?? session.paymentIntentId;
  if (
    session.discountCode &&
    !appliedCodes.includes(session.discountCode.toUpperCase()) &&
    paymentIntentId
  ) {
    try {
      await refundDeposit(paymentIntentId);
    } catch {
      // best-effort; the order is already recorded for manual follow-up
    }
  }

  return Response.json({ ok: true });
}
