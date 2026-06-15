// Transactional email via Fastmail's JMAP API (no SDK dependency). Sends are
// best-effort: any failure returns false and is swallowed by callers so the
// generation/critical path is never broken. Server-only — reads
// FASTMAIL_API_TOKEN (a Fastmail JMAP bearer token, `fmu…`).
//
// Flow: GET the session (apiUrl + mail accountId) → discover the Sent mailbox +
// the hello@nailismo.com sending identity → Email/set (create) +
// EmailSubmission/set (send), chained via a "#" back-reference in one request.

import type { DesignJob } from "./types";

const SESSION_URL = "https://api.fastmail.com/jmap/session";
const FROM_EMAIL = "hello@nailismo.com";
const FROM_NAME = "Nailismo";
const CAP_MAIL = "urn:ietf:params:jmap:mail";
const CAP_SUBMISSION = "urn:ietf:params:jmap:submission";

type JmapSession = { apiUrl: string; primaryAccounts: Record<string, string> };
type JmapResponse = { methodResponses: [string, Record<string, unknown>, string][] };

async function jmapPost(apiUrl: string, token: string, body: unknown): Promise<JmapResponse> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`jmap ${res.status}`);
  return (await res.json()) as JmapResponse;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const token = process.env.FASTMAIL_API_TOKEN;
  if (!token) return false;
  try {
    const sres = await fetch(SESSION_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (!sres.ok) return false;
    const session = (await sres.json()) as JmapSession;
    const apiUrl = session.apiUrl;
    const accountId = session.primaryAccounts?.[CAP_MAIL];
    if (!apiUrl || !accountId) return false;

    // Discover the Sent mailbox + the sending identity.
    const disc = await jmapPost(apiUrl, token, {
      using: [CAP_MAIL, CAP_SUBMISSION],
      methodCalls: [
        ["Mailbox/get", { accountId, properties: ["role", "name"] }, "0"],
        ["Identity/get", { accountId }, "1"],
      ],
    });
    const mailboxes = (disc.methodResponses[0][1].list ?? []) as { id: string; role: string | null }[];
    const identities = (disc.methodResponses[1][1].list ?? []) as { id: string; email: string }[];
    const sent =
      mailboxes.find((m) => m.role === "sent") ??
      mailboxes.find((m) => m.role === "drafts") ??
      mailboxes[0];
    const identity =
      identities.find((i) => i.email.toLowerCase() === FROM_EMAIL) ?? identities[0];
    if (!sent || !identity) return false;

    // Create the message (filed in Sent, marked read) and submit it.
    const send = await jmapPost(apiUrl, token, {
      using: [CAP_MAIL, CAP_SUBMISSION],
      methodCalls: [
        [
          "Email/set",
          {
            accountId,
            create: {
              msg: {
                mailboxIds: { [sent.id]: true },
                keywords: { $seen: true },
                from: [{ name: FROM_NAME, email: FROM_EMAIL }],
                to: [{ email: to }],
                subject,
                htmlBody: [{ partId: "body", type: "text/html" }],
                bodyValues: { body: { value: html } },
              },
            },
          },
          "0",
        ],
        [
          "EmailSubmission/set",
          {
            accountId,
            create: {
              sub: {
                emailId: "#msg",
                identityId: identity.id,
                envelope: { mailFrom: { email: FROM_EMAIL }, rcptTo: [{ email: to }] },
              },
            },
          },
          "1",
        ],
      ],
    });
    const emailSet = send.methodResponses[0][1] as { created?: Record<string, unknown>; notCreated?: Record<string, unknown> };
    const subSet = send.methodResponses[1][1] as { created?: Record<string, unknown>; notCreated?: Record<string, unknown> };
    if (emailSet.notCreated?.msg || subSet.notCreated?.sub) return false;
    return Boolean(subSet.created?.sub);
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
    <p>We turned your inspo into one custom set — here it is 3 ways. Tap below to view it and finish your order.</p>
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
