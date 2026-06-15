// Step 1 of the studio: receive the customer's reference image (base64, like
// /api/scan), store it to Blob, derive the {REF} descriptor, and create a
// pending_payment session. No charge yet. Returns the sessionId.

import { putUpload } from "@/lib/customize/blob";
import { describeReference } from "@/lib/customize/imagegen";
import { moderateImage } from "@/lib/customize/moderation";
import { newSessionId, upsertSession } from "@/lib/customize/session";
import { clientIp, rateLimited } from "@/lib/customize/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** ~4.4MB of base64 — a 1280px JPEG is well under this. */
const MAX_IMAGE_CHARS = 6_000_000;

function asStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(`upload:${clientIp(req)}`, 10)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  let body: {
    image?: unknown;
    shape?: unknown;
    note?: unknown;
    email?: unknown;
    finish?: unknown;
    feel?: unknown;
    occasion?: unknown;
    detail?: unknown;
    interpretation?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const image = body.image;
  if (typeof image !== "string" || image.length === 0) {
    return Response.json({ error: "missing image" }, { status: 400 });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "image too large" }, { status: 413 });
  }

  const dataUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

  // Content-safety gate BEFORE any storage or charge (fails open on infra error).
  const mod = await moderateImage(dataUrl);
  if (!mod.allowed) {
    return Response.json(
      { error: mod.reason || "That image can't be used — try a pattern, object, or color reference." },
      { status: 422 },
    );
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bytes = Buffer.from(base64, "base64");

  const sessionId = newSessionId();
  const uploadUrl = await putUpload(sessionId, bytes, "image/jpeg");

  // {REF} extraction is best-effort — a thin descriptor still yields usable art.
  let referenceDescriptor = "";
  try {
    referenceDescriptor = await describeReference(dataUrl);
  } catch {
    referenceDescriptor = "";
  }

  await upsertSession({
    sessionId,
    status: "pending_payment",
    uploadUrl,
    referenceDescriptor,
    shape: asStr(body.shape),
    note: asStr(body.note),
    finish: asStr(body.finish),
    feel: asStr(body.feel),
    occasion: asStr(body.occasion),
    detail: asStr(body.detail),
    interpretation: asStr(body.interpretation),
    email: asStr(body.email),
  });

  return Response.json({ sessionId, uploadUrl });
}
