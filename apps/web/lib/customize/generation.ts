// Generation orchestration: turn a paid session into 3 views of ONE design.
//
// Staged, because slots 1 & 2 must show the *same* design as slot 0:
//   1. Render slot 0 (the canonical hand-painted design) from the upload.
//   2. Feed slot 0's output image as the anchor reference into slots 1 (worn on
//      a hand) and 2 (in the retail kit), rendered in parallel.
// Each render gets one silent retry. If slot 0 can't be produced we can't derive
// the others, so the session fails and the $2 deposit is refunded. Triggered
// from the Stripe webhook via `after()` (never the client).

import { buildPrompts, type DesignPrompt } from "./prompts";
import { BRAND_ASSET_URLS } from "./brand-assets";
import { generateDesign } from "./imagegen";
import { putResult } from "./blob";
import { getSession, upsertSession } from "./session";
import { refundDeposit } from "./stripe";
import { addSessionToAccount } from "./account";
import { sendDesignsReady } from "./email";
import { magicLinkUrl } from "./auth";
import type { DesignJob } from "./types";

/** Generate one slot; one silent retry before giving up. Returns a data URL. */
async function renderWithRetry(prompt: string, refs: string[], seed: number): Promise<string> {
  try {
    return await generateDesign(prompt, refs, { seed });
  } catch {
    return await generateDesign(prompt, refs, { seed });
  }
}

/** Decode a base64 data URL and persist it as the slot's result; returns a ready job. */
async function persist(sessionId: string, p: DesignPrompt, dataUrl: string): Promise<DesignJob> {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  const resultUrl = await putResult(sessionId, p.slot, bytes);
  return { seed: p.seed, status: "ready", resultUrl };
}

export async function startGeneration(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session?.uploadUrl) return; // nothing to generate from

  const prompts = buildPrompts({
    referenceDescriptor: session.referenceDescriptor ?? "",
    shape: session.shape,
    note: session.note,
    finish: session.finish,
    feel: session.feel,
    occasion: session.occasion,
    detail: session.detail,
    interpretation: session.interpretation,
  });
  const canonical = prompts.find((p) => p.base === "upload")!; // slot 0
  const derived = prompts.filter((p) => p.base === "design"); // slots 1 & 2

  const jobs: DesignJob[] = prompts.map((p) => ({ seed: p.seed, status: "failed" }));

  // Stage 1 — the canonical design. Everything else copies it.
  let designDataUrl: string | null = null;
  try {
    const refs = [session.uploadUrl, ...(canonical.brandAsset ? [BRAND_ASSET_URLS[canonical.brandAsset]] : [])];
    designDataUrl = await renderWithRetry(canonical.prompt, refs, canonical.seed);
  } catch {
    designDataUrl = null;
  }

  if (!designDataUrl) {
    // No canonical design → can't derive the views. Fail + make the customer whole.
    await upsertSession({ sessionId, jobs, status: "failed" });
    if (session.paymentIntentId) {
      try {
        await refundDeposit(session.paymentIntentId);
      } catch {
        // Refund best-effort; status is already `failed` for follow-up.
      }
    }
    return;
  }

  jobs[canonical.slot] = await persist(sessionId, canonical, designDataUrl);

  // Stage 2 — the derived views, in parallel, anchored on the canonical design.
  const settled = await Promise.allSettled(
    derived.map(async (p) => {
      const refs = [designDataUrl!, ...(p.brandAsset ? [BRAND_ASSET_URLS[p.brandAsset]] : [])];
      const dataUrl = await renderWithRetry(p.prompt, refs, p.seed);
      return persist(sessionId, p, dataUrl);
    }),
  );
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") jobs[derived[i].slot] = r.value;
  });

  // Slot 0 is guaranteed ready here, so the session is always usable.
  await upsertSession({ sessionId, jobs, status: "ready" });

  // Deliver: index the session under the customer's email and email them their
  // designs + a magic link. Best-effort — never flip the session out of ready.
  if (session.email) {
    try {
      await addSessionToAccount(session.email, sessionId);
      await sendDesignsReady({
        email: session.email,
        jobs,
        loginUrl: magicLinkUrl(session.email, `/customize/result/${sessionId}`),
      });
    } catch {
      // Delivery is non-critical; the result page is still reachable by URL.
    }
  }
}
