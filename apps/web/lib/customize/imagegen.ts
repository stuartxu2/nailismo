// Image generation + reference description via the Vercel AI Gateway.
//
// Both calls use the OpenAI-compatible /v1/chat/completions endpoint and the
// same `AI_GATEWAY_API_KEY ?? VERCEL_OIDC_TOKEN` auth as api/scan/route.ts.
// - describeReference: free-tier gemini-2.5-flash vision → {REF} descriptor.
// - generateDesign:    gemini-3-pro-image (Nano Banana 2) → a base64 data URL,
//   returned in choices[0].message.images[].image_url.url (confirmed shape).
// Server-only; never log token values.

export class ImageGenConfigError extends Error {}

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3-pro-image";
const VISION_MODEL = "google/gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 120_000;

function authToken(): string {
  const token = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) throw new ImageGenConfigError("AI_GATEWAY_API_KEY not configured");
  return token;
}

async function postGateway(body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: signal ?? controller.signal,
      cache: "no-store",
    });
  } catch {
    throw new Error("image-gen upstream unreachable");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`image-gen failed (${res.status})`);
  return res.json();
}

type GatewayImageResponse = {
  choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
};

/** Pull the first base64 image data URL out of a chat/completions response. */
export function extractImageUrl(json: unknown): string | null {
  const images = (json as GatewayImageResponse)?.choices?.[0]?.message?.images;
  if (!Array.isArray(images)) return null;
  for (const im of images) {
    const u = im?.image_url?.url;
    if (typeof u === "string" && u.startsWith("data:image")) return u;
  }
  return null;
}

type GatewayTextResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

/** Pull the assistant text out of a chat/completions response. */
export function extractText(json: unknown): string {
  const c = (json as GatewayTextResponse)?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c.trim() : "";
}

export type GenerateOptions = {
  /** Passed through as the OpenAI-compat `seed` for reproducibility. */
  seed?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Generate one nail-art mockup. `refImages` are data URLs or HTTPS URLs (the
 * customer's design first, then any fixed brand asset). Returns a base64 image
 * data URL — the caller decodes + persists it to Blob.
 */
export async function generateDesign(
  prompt: string,
  refImages: string[],
  opts: GenerateOptions = {},
): Promise<string> {
  const content: unknown[] = [{ type: "text", text: prompt }];
  for (const url of refImages) content.push({ type: "image_url", image_url: { url } });

  const json = await postGateway(
    {
      model: IMAGE_MODEL,
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
      messages: [{ role: "user", content }],
    },
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    opts.signal,
  );

  const url = extractImageUrl(json);
  if (!url) throw new Error("image-gen returned no image");
  return url;
}

const REF_SYSTEM =
  "You describe an image as inspiration for nail art. Reply with ONE short phrase (max 20 words): " +
  "dominant colors, key motifs, and overall mood. No preamble, no punctuation beyond commas.";

/** Derive the {REF} descriptor from the customer's uploaded image. */
export async function describeReference(
  imageDataUrl: string,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const json = await postGateway(
    {
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 60,
      messages: [
        { role: "system", content: REF_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this for nail-art inspiration." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    },
    opts.timeoutMs ?? 30_000,
    opts.signal,
  );
  return extractText(json).replace(/^["']|["']$/g, "").slice(0, 200);
}
