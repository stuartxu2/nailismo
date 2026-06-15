// Transactional email via Resend's REST API (no SDK dependency). Sends are
// best-effort: any failure returns false and is swallowed by callers so the
// generation/critical path is never broken. Server-only (reads RESEND_API_KEY).

import type { DesignJob } from "./types";

const RESEND_URL = "https://api.resend.com/emails";
const FROM = "Nailismo <hello@nailismo.com>";

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-family:system-ui,sans-serif">${label}</a>`;
}

export async function sendDesignsReady(opts: {
  email: string;
  jobs: DesignJob[];
  loginUrl: string;
}): Promise<boolean> {
  const thumbs = opts.jobs
    .filter((j) => j.status === "ready" && j.resultUrl)
    .map(
      (j) =>
        `<img src="${j.resultUrl}" width="150" height="150" alt="Your custom nail design" style="border-radius:14px;margin:6px;object-fit:cover" />`,
    )
    .join("");
  const html = `
  <div style="max-width:520px;margin:0 auto;font-family:system-ui,sans-serif;color:#111">
    <h1 style="font-size:24px">Your custom nail designs are ready ✨</h1>
    <p>We turned your inspo into 3 looks. Tap below to view them and finish your order.</p>
    <div style="text-align:center;margin:18px 0">${thumbs}</div>
    <div style="text-align:center;margin:24px 0">${button(opts.loginUrl, "View &amp; finish your order")}</div>
    <p style="color:#555;font-size:14px">Your <strong>$2 deposit is already credited</strong> — you’ll pay $67 for your $69 custom set. This link also signs you in to see all your designs anytime.</p>
  </div>`;
  return sendEmail(opts.email, "Your custom nail designs are ready ✨", html);
}

export async function sendMagicLink(email: string, loginUrl: string): Promise<boolean> {
  const html = `
  <div style="max-width:520px;margin:0 auto;font-family:system-ui,sans-serif;color:#111">
    <h1 style="font-size:22px">Sign in to your designs</h1>
    <p>Tap below to view your custom nail designs and pick up where you left off.</p>
    <div style="text-align:center;margin:24px 0">${button(loginUrl, "View my designs")}</div>
    <p style="color:#555;font-size:14px">If you didn’t request this, you can ignore it.</p>
  </div>`;
  return sendEmail(email, "Sign in to your Nailismo designs", html);
}
