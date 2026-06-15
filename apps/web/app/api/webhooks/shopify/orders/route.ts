// Shopify orders/paid reconciliation. Verifies the HMAC, then for an order that
// carries a Customize session (via the `_session_id` line-item property):
//  - marks the session `ordered`
//  - if the $2-off code did NOT apply (customer paid full $69), refunds the $2
//    Stripe deposit so the promise stays literally true (net $69).
//
// Register this topic via the webhook tool before it fires in production.

import { verifyShopifyHmac } from "@/lib/shopify/webhook-verify";
import { getSession, transitionSession } from "@/lib/customize/session";
import { linkShopifyCustomer } from "@/lib/customize/account";
import { refundDeposit } from "@/lib/customize/stripe";
import type { CustomizeSession } from "@/lib/customize/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderProp = { name: string; value: string };
type OrderLine = { properties?: OrderProp[] };
type OrderPayload = {
  id?: number;
  admin_graphql_api_id?: string;
  line_items?: OrderLine[];
  discount_codes?: Array<{ code?: string }>;
  customer?: { id?: number; admin_graphql_api_id?: string; email?: string };
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

  // Soft link to Shopify (gids): stamp the session + designs account so a design
  // can be traced to its order/buyer and vice-versa, without merging logins.
  const shopifyOrderId =
    order.admin_graphql_api_id ?? (order.id ? `gid://shopify/Order/${order.id}` : undefined);
  const shopifyCustomerId =
    order.customer?.admin_graphql_api_id ??
    (order.customer?.id ? `gid://shopify/Customer/${order.customer.id}` : undefined);

  // Mark ordered (idempotent: skip if already past selection), stamping the link.
  if (session.status === "selected" || session.status === "ready") {
    const extra: Partial<CustomizeSession> = {};
    if (shopifyOrderId) extra.shopifyOrderId = shopifyOrderId;
    if (shopifyCustomerId) extra.shopifyCustomerId = shopifyCustomerId;
    await transitionSession(sessionId, "ordered", extra);
  }

  // Tie the email's designs account to its Shopify customer (best-effort).
  const customerEmail = order.customer?.email ?? session.email;
  if (shopifyCustomerId && customerEmail) {
    try {
      await linkShopifyCustomer(customerEmail, shopifyCustomerId);
    } catch {
      // non-critical; the order is already recorded
    }
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
