// Step 4→5: the customer picks one of the 3 designs (+ a size). Mint the
// $2-off code, record the selection, and return a hosted checkout URL carrying
// the chosen design as line attributes (net $67 → $69 across both charges).

import { getSession, upsertSession } from "@/lib/customize/session";
import { mintDepositCode } from "@/lib/customize/discount";
import { createCustomCheckout, type CartAttribute } from "@/lib/customize/checkout";
import { CUSTOM_VARIANTS, isNailSize } from "@/lib/customize/product";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  let body: { sessionId?: unknown; selectedIndex?: unknown; size?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { sessionId, selectedIndex, size } = body;
  if (typeof sessionId !== "string" || !sessionId) {
    return Response.json({ error: "missing sessionId" }, { status: 400 });
  }
  if (typeof selectedIndex !== "number" || !Number.isInteger(selectedIndex) || selectedIndex < 0) {
    return Response.json({ error: "invalid selectedIndex" }, { status: 400 });
  }
  if (!isNailSize(size)) {
    return Response.json({ error: "invalid size" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return Response.json({ error: "unknown session" }, { status: 404 });
  }
  if (session.status !== "ready" && session.status !== "selected") {
    return Response.json({ error: "session not ready to select" }, { status: 409 });
  }

  const job = session.jobs?.[selectedIndex];
  if (!job || job.status !== "ready" || !job.resultUrl) {
    return Response.json({ error: "chosen design not ready" }, { status: 400 });
  }

  // Reuse an already-minted code on re-select (deterministic + idempotent).
  const discountCode = session.discountCode ?? (await mintDepositCode(sessionId));

  await upsertSession({ sessionId, selectedIndex, discountCode, status: "selected" });

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
