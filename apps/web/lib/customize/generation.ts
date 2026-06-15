// Generation orchestration: turn a paid session into 3 mockups.
//
// Runs the 3 prompts in parallel (each with one silent retry), persists every
// finished image to Blob, and records per-slot status on the session. If at
// least one lands we go `ready`; if all three fail we go `failed` and refund the
// $2 deposit. Triggered from the Stripe webhook via `after()` (never the client).

import { buildPrompts } from "./prompts";
import { BRAND_ASSET_URLS } from "./brand-assets";
import { generateDesign } from "./imagegen";
import { putResult } from "./blob";
import { getSession, upsertSession } from "./session";
import { refundDeposit } from "./stripe";
import type { DesignJob } from "./types";

/** Generate one slot; one silent retry before giving up. Returns a data URL. */
async function renderWithRetry(prompt: string, refs: string[], seed: number): Promise<string> {
  try {
    return await generateDesign(prompt, refs, { seed });
  } catch {
    return await generateDesign(prompt, refs, { seed });
  }
}

export async function startGeneration(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session?.uploadUrl) return; // nothing to generate from

  const prompts = buildPrompts({
    referenceDescriptor: session.referenceDescriptor ?? "",
    shape: session.shape,
    note: session.note,
  });

  const settled = await Promise.allSettled(
    prompts.map(async (p) => {
      const refs = [
        session.uploadUrl!,
        ...(p.brandAsset ? [BRAND_ASSET_URLS[p.brandAsset]] : []),
      ];
      const dataUrl = await renderWithRetry(p.prompt, refs, p.seed);
      const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
      return putResult(sessionId, p.slot, bytes);
    }),
  );

  const jobs: DesignJob[] = prompts.map((p, i) => {
    const r = settled[i];
    return r.status === "fulfilled"
      ? { seed: p.seed, status: "ready", resultUrl: r.value }
      : { seed: p.seed, status: "failed" };
  });

  if (jobs.some((j) => j.status === "ready")) {
    await upsertSession({ sessionId, jobs, status: "ready" });
    return;
  }

  // Total failure — fail the session and make the customer whole.
  await upsertSession({ sessionId, jobs, status: "failed" });
  if (session.paymentIntentId) {
    try {
      await refundDeposit(session.paymentIntentId);
    } catch {
      // Refund best-effort; status is already `failed` for follow-up.
    }
  }
}
