// Nail-size scanner detection endpoint.
//
// Takes one top-down photo (downscaled base64 JPEG) of a flat hand beside a
// standard ID-1 / bank card and returns, in normalized image coordinates, the
// card's long edge plus a width segment across each of the five fingernails.
// The mobile app converts those to mm using the card (85.6mm) as the scale and
// recommends a press-on set size. Vision runs on Gemini 2.5 Flash, routed
// through Vercel AI Gateway (best-in-class at precise coordinate output).
//
// The model is imperfect on exact pixels, which is by design: the app shows the
// returned segments as editable outlines the user can nudge before computing.

import { FINGERS, type FingerKey } from "@nailismo/fit-sizing";

export const runtime = "nodejs";
export const maxDuration = 30;

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

/** Reject payloads larger than ~4.4MB of base64 (a 1280px JPEG is far smaller). */
const MAX_IMAGE_CHARS = 6_000_000;

/** Best-effort in-memory rate limit (per warm instance) — deters trivial abuse. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

const SYSTEM_PROMPT = `You are a precise computer-vision measuring tool for a press-on nail store.
The image shows ONE human hand lying flat, palm down, fingers spread, photographed from directly above, with a standard ID-1 / bank card (85.6mm long edge) lying flat on the SAME surface next to the hand.

Return ONLY a JSON object. All coordinates are normalized to the image: x runs 0 (left) to 1 (right), y runs 0 (top) to 1 (bottom). Use decimals.

Find:
1. The reference card. Give the two endpoints "a" and "b" of ONE LONG edge (the 85.6mm side). Choose the long edge that is clearest and least occluded.
2. FOUR fingernails: index, middle, ring, and pinky. Do NOT measure the thumb — in a flat top-down photo the thumb nail faces sideways (edge-on) and its width cannot be read; it is estimated separately. For each of the four, give endpoints "a" and "b" of the nail's WIDTH — the widest span across the nail bed, perpendicular to the finger. This is the WIDTH, not the length. Include a "confidence" between 0 and 1.

Respond with exactly this shape:
{"found":true,"card":{"a":[x,y],"b":[x,y]},"nails":[{"finger":"index","a":[x,y],"b":[x,y],"confidence":0.9},{"finger":"middle","a":[x,y],"b":[x,y],"confidence":0.9},{"finger":"ring","a":[x,y],"b":[x,y],"confidence":0.9},{"finger":"pinky","a":[x,y],"b":[x,y],"confidence":0.9}]}

If you cannot clearly find both the card and at least three of the four fingernails, return {"found":false}. Output JSON only — no prose, no code fences.`;

type Point = [number, number];
type Seg = { a: Point; b: Point };
type NailDetection = { finger: FingerKey; a: Point; b: Point; confidence: number };
type ScanResult =
  | { found: false }
  | { found: true; card: Seg; nails: NailDetection[] };

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function asPoint(v: unknown): Point | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const x = Number(v[0]);
  const y = Number(v[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [clamp01(x), clamp01(y)];
}

function asSeg(v: unknown): Seg | null {
  if (!v || typeof v !== "object") return null;
  const a = asPoint((v as Record<string, unknown>).a);
  const b = asPoint((v as Record<string, unknown>).b);
  return a && b ? { a, b } : null;
}

/** Validate and normalize the model's raw JSON into a trusted ScanResult. */
function normalize(raw: unknown): ScanResult {
  if (!raw || typeof raw !== "object") return { found: false };
  const obj = raw as Record<string, unknown>;
  if (obj.found === false) return { found: false };

  const card = asSeg(obj.card);
  if (!card) return { found: false };

  const seen = new Map<FingerKey, NailDetection>();
  if (Array.isArray(obj.nails)) {
    for (const n of obj.nails) {
      if (!n || typeof n !== "object") continue;
      const rec = n as Record<string, unknown>;
      const finger = rec.finger as FingerKey;
      if (!FINGERS.includes(finger)) continue;
      if (finger === "thumb") continue; // thumb is derived client-side, never measured
      const seg = asSeg(rec);
      if (!seg) continue;
      const confidence = clamp01(Number(rec.confidence ?? 0.5));
      const prev = seen.get(finger);
      // Keep the higher-confidence detection if a finger is reported twice.
      if (!prev || confidence > prev.confidence) {
        seen.set(finger, { finger, ...seg, confidence });
      }
    }
  }

  const nails = FINGERS.map((f) => seen.get(f)).filter(
    (n): n is NailDetection => Boolean(n),
  );
  if (nails.length < 3) return { found: false };

  return { found: true, card, nails };
}

function toDataUrl(image: string): string {
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
}

export async function POST(req: Request): Promise<Response> {
  // OIDC token is injected automatically on Vercel; AI_GATEWAY_API_KEY is used
  // locally / for BYOK. Surface only the key NAME if neither is present.
  const token = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    return Response.json(
      { error: "AI_GATEWAY_API_KEY not configured" },
      { status: 500 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  let image: unknown;
  try {
    ({ image } = (await req.json()) as { image?: unknown });
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof image !== "string" || image.length === 0) {
    return Response.json({ error: "missing image" }, { status: 400 });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "image too large" }, { status: 413 });
  }

  let gatewayRes: Response;
  try {
    gatewayRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // No response_format: the Gateway rejects json_object for Gemini. The
        // system prompt mandates bare JSON and the parser strips stray fences.
        model: MODEL,
        temperature: 0,
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Measure this hand and card." },
              { type: "image_url", image_url: { url: toDataUrl(image) } },
            ],
          },
        ],
      }),
    });
  } catch {
    return Response.json({ error: "detection upstream unreachable" }, { status: 502 });
  }

  if (!gatewayRes.ok) {
    return Response.json(
      { error: `detection failed (${gatewayRes.status})` },
      { status: 502 },
    );
  }

  let content: string;
  try {
    const data = (await gatewayRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    content = data.choices?.[0]?.message?.content ?? "";
  } catch {
    return Response.json({ error: "bad detection response" }, { status: 502 });
  }

  // json_object mode returns bare JSON; strip stray fences just in case.
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json({ found: false } satisfies ScanResult);
  }

  return Response.json(normalize(parsed));
}
