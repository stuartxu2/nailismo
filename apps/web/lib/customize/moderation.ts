// Pre-charge content safety check on the uploaded reference, via the AI Gateway
// vision model (same auth as the scanner). Fails OPEN — an infra hiccup or
// missing config never blocks a legit customer; a confident unsafe verdict does.
// The all-fail refund path (generation) is the backstop for anything that slips.

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const SYSTEM =
  'You are a content-safety check for a press-on NAIL-ART store. The user uploads a ' +
  'reference image to be turned into nail art. Reply with ONLY JSON {"allowed":boolean,"reason":string}. ' +
  "Set allowed=false ONLY if the image clearly contains: explicit nudity or sexual content, graphic " +
  "violence or gore, hate symbols, or a real identifiable person's face as the main subject (nail-art " +
  "references should be patterns, objects, colors or scenes — not portraits of people). Otherwise " +
  "allowed=true. When blocked, reason is one short, friendly user-facing sentence; when allowed, reason is empty.";

export type Moderation = { allowed: boolean; reason: string };

export async function moderateImage(
  imageDataUrl: string,
  opts: { timeoutMs?: number } = {},
): Promise<Moderation> {
  const token = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) return { allowed: true, reason: "" }; // fail-open if unconfigured

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
      cache: "no-store",
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Check this reference image." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { allowed: true, reason: "" }; // fail-open on upstream error
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = (data.choices?.[0]?.message?.content ?? "")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed = JSON.parse(raw) as { allowed?: unknown; reason?: unknown };
    return {
      allowed: parsed.allowed !== false,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return { allowed: true, reason: "" }; // fail-open on timeout / bad JSON
  } finally {
    clearTimeout(timer);
  }
}
