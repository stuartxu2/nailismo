// Step 4→5: the customer confirms their custom design (+ a size). There is ONE
// design — slots are just three views of it (flat-lay / on-hand / in-kit) — so
// the canonical flat-lay (the first ready job) is what gets hand-made. Mint the
// $2-off code, record the order intent, and return a hosted checkout URL
// carrying the design as line attributes (net $67 → $69 across both charges).

import { getSession, upsertSession } from "@/lib/customize/session";
import { mintDepositCode } from "@/lib/customize/discount";
import { createCustomCheckout, type CartAttribute } from "@/lib/customize/checkout";
import { CUSTOM_VARIANTS, isNailSize } from "@/lib/customize/product";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  let body: { sessionId?: unknown; size?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { sessionId, size } = body;
  if (typeof sessionId !== "string" || !sessionId) {
    return Response.json({ error: "missing sessionId" }, { status: 400 });
  }
  if (!isNailSize(size)) {
    return Response.json({ error: "invalid size" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return Response.json({ error: "unknown session" }, { status: 404 });
  }
  if (session.status !== "ready" && session.status !== "selected") {
    return Response.json({ error: "session not ready to order" }, { status: 409 });
  }

  // The design = the canonical flat-lay (slot 0). Fall back to any ready view.
  const job = session.jobs?.find((j) => j.status === "ready" && j.resultUrl);
  if (!job?.resultUrl) {
    return Response.json({ error: "design not ready" }, { status: 400 });
  }

  // Reuse an already-minted code on re-order (deterministic + idempotent).
  const discountCode = session.discountCode ?? (await mintDepositCode(sessionId));

  await upsertSession({ sessionId, selectedIndex: 0, discountCode, status: "selected" });

  const attributes: CartAttribute[] = [
    { key: "_design_url", value: job.resultUrl },
    { key: "_session_id", value: sessionId },
    ...(session.paymentIntentId
      ? [{ key: "_payment_intent", value: session.paymentIntentId }]
      : []),
  ];

  const checkoutUrl = await createCustomCheckout({
    variantId: CUSTOM_VARIANTS[size],
    attributes,
    discountCode,
  });

  return Response.json({ checkoutUrl });
}
