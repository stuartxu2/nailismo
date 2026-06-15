# Customize Account + Email Delivery + Resume — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a customer's 3 custom-nail designs finish generating, email them their designs + a passwordless login link; let them log in to a personal page listing all their designs and resume the order via the existing result page.

**Architecture:** Stateless HMAC magic-link tokens + signed cookie (no DB). Resend via REST (no new dep) sends the ready-email. A small `customize_account` metaobject indexes email → sessionIds for the aggregate list. Hook fires from `startGeneration` after status→ready; result page stays public/shareable, only `/account/designs` is gated.

**Tech Stack:** Next.js 16 App Router (route handlers, server components, `cookies()` from next/headers, `NextResponse`), Node `crypto` HMAC, Shopify Admin metaobjects (`adminFetch`), Vitest.

> **Provider note (resolved during build):** Task 4 was planned against Resend, but the supplied key was a **Fastmail JMAP token**, so `email.ts` was implemented against **Fastmail's JMAP API** (session → discover Sent mailbox + identity → `Email/set` + `EmailSubmission/set`) and the env var is **`FASTMAIL_API_TOKEN`** (not `RESEND_API_KEY`). Sender: `hello@nailismo.com`. The Task 4 / Task 8 snippets below show the original Resend wording — the shipped code is Fastmail JMAP.

> **Next 16 caveat (apps/web/AGENTS.md):** APIs differ from training data. Before writing route handlers / `cookies()` usage, skim `node_modules/next/dist/docs/` for the current `cookies()` and Route Handler signatures. `cookies()` is async (`await cookies()`).

---

## File structure

**New:**
- `apps/web/lib/customize/auth.ts` — token sign/verify, magic-link URL, cookie read + value/options.
- `apps/web/lib/customize/auth.test.ts`
- `apps/web/lib/customize/account.ts` — `customize_account` index metaobject CRUD.
- `apps/web/lib/customize/account.test.ts`
- `apps/web/lib/customize/email.ts` — Resend send: `sendDesignsReady`, `sendMagicLink`.
- `apps/web/lib/customize/email.test.ts`
- `apps/web/app/account/verify/route.ts` — GET magic-link verify → cookie → redirect.
- `apps/web/app/api/account/request-link/route.ts` — POST email → fresh magic link.
- `apps/web/app/api/account/request-link/route.test.ts`
- `apps/web/app/account/login/page.tsx` — request-a-link form (client).
- `apps/web/app/account/designs/page.tsx` — gated list (server).

**Modified:**
- `apps/web/lib/customize/generation.ts` — fire index + email on ready.
- `apps/web/lib/customize/generation.test.ts` — assert the ready-hook.
- `apps/web/app/customize/result/[sessionId]/ResultPicker.tsx` — add "My designs" nav link.

**One-time setup (no code file):** create `customize_account` metaobject definition in Shopify; generate `CUSTOMIZE_AUTH_SECRET`; push `RESEND_API_KEY` + `CUSTOMIZE_AUTH_SECRET` to Vercel prod.

---

## Task 1: Magic-link auth (tokens, cookie, link URL)

**Files:**
- Create: `apps/web/lib/customize/auth.ts`
- Test: `apps/web/lib/customize/auth.test.ts`

Token = `base64url(JSON{e,x}) + "." + base64url(HMAC-SHA256(payload))`. Secret read **lazily** inside functions so tests can set env before each call. Cookie reuses the same signed-token format.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/customize/auth.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { signToken, verifyToken, magicLinkUrl, sessionCookieValue } from "./auth";

beforeEach(() => {
  process.env.CUSTOMIZE_AUTH_SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
  process.env.NEXT_PUBLIC_SITE_URL = "https://nailismo.com";
});

describe("signToken / verifyToken", () => {
  it("round-trips the email (lowercased, trimmed)", () => {
    const t = signToken("  User@Example.com ", 60);
    expect(verifyToken(t)).toBe("user@example.com");
  });

  it("rejects an expired token", () => {
    const t = signToken("a@b.com", -1); // already expired
    expect(verifyToken(t)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const t = signToken("a@b.com", 60);
    const tampered = t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa");
    expect(verifyToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens and a missing secret", () => {
    expect(verifyToken("garbage")).toBeNull();
    expect(verifyToken("")).toBeNull();
    const t = signToken("a@b.com", 60);
    delete process.env.CUSTOMIZE_AUTH_SECRET;
    expect(verifyToken(t)).toBeNull();
  });
});

describe("magicLinkUrl", () => {
  it("builds an absolute /account/verify link with token + next", () => {
    const url = new URL(magicLinkUrl("a@b.com", "/customize/result/s1"));
    expect(url.origin + url.pathname).toBe("https://nailismo.com/account/verify");
    expect(url.searchParams.get("next")).toBe("/customize/result/s1");
    expect(verifyToken(url.searchParams.get("token")!)).toBe("a@b.com");
  });
});

describe("sessionCookieValue", () => {
  it("is a verifiable long-lived token", () => {
    expect(verifyToken(sessionCookieValue("a@b.com"))).toBe("a@b.com");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run lib/customize/auth.test.ts`
Expected: FAIL — `auth.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/customize/auth.ts
// Stateless passwordless auth for the Customize studio. A magic-link token and
// the login cookie share one HMAC-signed format: base64url(JSON{e,x}).sig.
// No storage — the signature is the proof. Server-only (reads the secret).

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "nm_acct";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days for both link and cookie

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};

function secret(): string {
  return process.env.CUSTOMIZE_AUTH_SECRET ?? "";
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function signToken(email: string, ttlSeconds: number): string {
  const payload = {
    e: email.trim().toLowerCase(),
    x: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${p}.${sign(p)}`;
}

/** Returns the email if the token is valid + unexpired, else null. */
export function verifyToken(token: string): string | null {
  if (!secret() || !token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(p);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(p, "base64url").toString()) as {
      e?: unknown;
      x?: unknown;
    };
    if (typeof e !== "string" || typeof x !== "number") return null;
    if (Math.floor(Date.now() / 1000) > x) return null;
    return e;
  } catch {
    return null;
  }
}

export function sessionCookieValue(email: string): string {
  return signToken(email, TTL_SECONDS);
}

/** Absolute magic-link URL that lands on /account/verify and then `next`. */
export function magicLinkUrl(email: string, next: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";
  const u = new URL("/account/verify", base);
  u.searchParams.set("token", signToken(email, TTL_SECONDS));
  u.searchParams.set("next", next);
  return u.toString();
}

/** Read the logged-in email from the signed cookie, or null. (Server only.) */
export async function readSessionEmail(): Promise<string | null> {
  const v = (await cookies()).get(SESSION_COOKIE)?.value;
  return v ? verifyToken(v) : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run lib/customize/auth.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/customize/auth.ts apps/web/lib/customize/auth.test.ts
git commit -m "feat(customize): magic-link token + cookie auth helpers"
```

---

## Task 2: Email→sessions index metaobject

**Files:**
- Create: `apps/web/lib/customize/account.ts`
- Test: `apps/web/lib/customize/account.test.ts`

Mirrors `session.ts`'s upsert/by-handle pattern but for a `customize_account` metaobject. Handle = `acct-<hmac8(email)>`. Dedup on add (idempotent for webhook retries).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/customize/account.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("../shopify/admin", () => ({ adminFetch }));

import { accountHandle, addSessionToAccount, listSessionIds } from "./account";

beforeEach(() => {
  process.env.CUSTOMIZE_AUTH_SECRET = "test-secret";
  adminFetch.mockReset();
});

describe("accountHandle", () => {
  it("is deterministic, prefixed, case/space-insensitive", () => {
    const a = accountHandle(" A@B.com ");
    const b = accountHandle("a@b.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^acct-[0-9a-f]{16}$/);
  });
});

describe("listSessionIds", () => {
  it("returns [] when no account exists", async () => {
    adminFetch.mockResolvedValueOnce({ metaobjectByHandle: null });
    expect(await listSessionIds("a@b.com")).toEqual([]);
  });

  it("parses the stored session_ids JSON", async () => {
    adminFetch.mockResolvedValueOnce({
      metaobjectByHandle: { fields: [{ key: "session_ids", value: '["s1","s2"]' }] },
    });
    expect(await listSessionIds("a@b.com")).toEqual(["s1", "s2"]);
  });
});

describe("addSessionToAccount", () => {
  it("appends a new id (read then upsert with email + ids)", async () => {
    adminFetch
      .mockResolvedValueOnce({ metaobjectByHandle: { fields: [{ key: "session_ids", value: '["s1"]' }] } })
      .mockResolvedValueOnce({ metaobjectUpsert: { userErrors: [] } });
    await addSessionToAccount("a@b.com", "s2");
    const upsertVars = adminFetch.mock.calls[1][1] as { metaobject: { fields: { key: string; value: string }[] } };
    const fields = new Map(upsertVars.metaobject.fields.map((f) => [f.key, f.value]));
    expect(JSON.parse(fields.get("session_ids")!)).toEqual(["s1", "s2"]);
    expect(fields.get("email")).toBe("a@b.com");
  });

  it("is idempotent — a duplicate id does not re-upsert", async () => {
    adminFetch.mockResolvedValueOnce({
      metaobjectByHandle: { fields: [{ key: "session_ids", value: '["s1"]' }] },
    });
    await addSessionToAccount("a@b.com", "s1");
    expect(adminFetch).toHaveBeenCalledTimes(1); // read only, no upsert
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run lib/customize/account.test.ts`
Expected: FAIL — `account.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/customize/account.ts
// Email → [sessionId] index, backed by a `customize_account` metaobject (handle
// = acct-<hmac8(email)>). Reliable aggregate lookup without depending on
// Shopify metaobject field-querying. Server-only (Admin API + secret).

import { createHmac } from "node:crypto";
import { adminFetch } from "../shopify/admin";

const TYPE = "customize_account";

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function accountHandle(email: string): string {
  const salt = process.env.CUSTOMIZE_AUTH_SECRET || "acct";
  const h = createHmac("sha256", salt).update(normEmail(email)).digest("hex").slice(0, 16);
  return `acct-${h}`;
}

const BY_HANDLE = /* GraphQL */ `
  query AcctByHandle($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) { fields { key value } }
  }
`;
const UPSERT = /* GraphQL */ `
  mutation AcctUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { handle }
      userErrors { field message code }
    }
  }
`;

type ByHandle = { metaobjectByHandle: { fields: { key: string; value: string | null }[] } | null };
type Upsert = { metaobjectUpsert: { userErrors: { message: string }[] } };

async function readIds(email: string): Promise<string[]> {
  const data = await adminFetch<ByHandle>(BY_HANDLE, {
    handle: { type: TYPE, handle: accountHandle(email) },
  });
  const raw = data.metaobjectByHandle?.fields.find((f) => f.key === "session_ids")?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function listSessionIds(email: string): Promise<string[]> {
  return readIds(email);
}

export async function addSessionToAccount(email: string, sessionId: string): Promise<void> {
  const ids = await readIds(email);
  if (ids.includes(sessionId)) return; // idempotent
  const next = [...ids, sessionId];
  const data = await adminFetch<Upsert>(UPSERT, {
    handle: { type: TYPE, handle: accountHandle(email) },
    metaobject: {
      fields: [
        { key: "email", value: normEmail(email) },
        { key: "session_ids", value: JSON.stringify(next) },
      ],
    },
  });
  const errs = data.metaobjectUpsert.userErrors;
  if (errs.length) throw new Error(`account upsert failed: ${errs.map((e) => e.message).join("; ")}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run lib/customize/account.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/customize/account.ts apps/web/lib/customize/account.test.ts
git commit -m "feat(customize): email->sessions account index metaobject"
```

---

## Task 3: Create the `customize_account` metaobject definition (one-time)

**Files:** none (Shopify setup via the Shopify MCP `graphql_mutation` tool).

> The `addSessionToAccount` upsert will fail until this definition exists. Run once against the live store.

- [ ] **Step 1: Run the definition mutation** (Shopify MCP `graphql_mutation`):

```graphql
mutation {
  metaobjectDefinitionCreate(definition: {
    name: "Customize Account",
    type: "customize_account",
    access: { storefront: NONE },
    fieldDefinitions: [
      { name: "Email", key: "email", type: "single_line_text_field" },
      { name: "Session IDs", key: "session_ids", type: "json" }
    ]
  }) {
    metaobjectDefinition { id type }
    userErrors { field message code }
  }
}
```

- [ ] **Step 2: Verify**

Expected: `metaobjectDefinition.type == "customize_account"`, empty `userErrors`. If `userErrors` says it already exists, that's fine (idempotent — leave it).

---

## Task 4: Resend email send

**Files:**
- Create: `apps/web/lib/customize/email.ts`
- Test: `apps/web/lib/customize/email.test.ts`

Two senders sharing a private `sendEmail`. Failures are swallowed (return `false`) so they never break the generation critical path.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/customize/email.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendDesignsReady, sendMagicLink } from "./email";
import type { DesignJob } from "./types";

const JOBS: DesignJob[] = [
  { seed: 101, status: "ready", resultUrl: "https://blob/r0.png" },
  { seed: 202, status: "ready", resultUrl: "https://blob/r1.png" },
  { seed: 303, status: "failed" },
];

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  vi.restoreAllMocks();
});

describe("sendDesignsReady", () => {
  it("POSTs to Resend with the link, ready thumbnails, and the credit line", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const ok = await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "https://nailismo.com/account/verify?token=T" });
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.from).toContain("hello@nailismo.com");
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.html).toContain("https://nailismo.com/account/verify?token=T");
    expect(body.html).toContain("https://blob/r0.png");
    expect(body.html).toContain("https://blob/r1.png");
    expect(body.html).not.toContain("https://blob/r2"); // failed job has no thumb
    expect(body.html.toLowerCase()).toContain("$2");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer re_test" });
  });

  it("returns false (swallows) when the API errors or the key is missing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    expect(await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "u" })).toBe(false);
    delete process.env.RESEND_API_KEY;
    expect(await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "u" })).toBe(false);
  });
});

describe("sendMagicLink", () => {
  it("POSTs a login link email", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendMagicLink("a@b.com", "https://nailismo.com/account/verify?token=T")).toBe(true);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.html).toContain("https://nailismo.com/account/verify?token=T");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run lib/customize/email.test.ts`
Expected: FAIL — `email.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/customize/email.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run lib/customize/email.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/customize/email.ts apps/web/lib/customize/email.test.ts
git commit -m "feat(customize): Resend transactional email (designs-ready + magic link)"
```

---

## Task 5: Fire index + email when generation is ready

**Files:**
- Modify: `apps/web/lib/customize/generation.ts`
- Modify: `apps/web/lib/customize/generation.test.ts`

After the final ready upsert, if the session has an email: index it and email the designs. Wrapped in try/catch so a mail/index failure never flips the session away from `ready`.

- [ ] **Step 1: Write the failing test** (append to `generation.test.ts`)

Add these hoisted mocks near the top, alongside the existing ones:

```ts
const { addSessionToAccount } = vi.hoisted(() => ({ addSessionToAccount: vi.fn() }));
const { sendDesignsReady } = vi.hoisted(() => ({ sendDesignsReady: vi.fn() }));
vi.mock("./account", () => ({ addSessionToAccount }));
vi.mock("./email", () => ({ sendDesignsReady }));
```

Reset them in `beforeEach`:

```ts
  addSessionToAccount.mockReset();
  sendDesignsReady.mockReset();
```

Then append this test inside `describe("startGeneration", ...)`:

```ts
  it("indexes + emails the customer when ready and an email is present", async () => {
    getSession.mockResolvedValueOnce({ ...SESSION, email: "buyer@x.com" });
    generateDesign.mockResolvedValue("data:image/png;base64,QUJD");
    putResult.mockImplementation(async (_s: string, slot: number) => `https://blob/r${slot}.png`);

    await startGeneration("s1");

    expect(addSessionToAccount).toHaveBeenCalledWith("buyer@x.com", "s1");
    expect(sendDesignsReady).toHaveBeenCalledTimes(1);
    const arg = sendDesignsReady.mock.calls[0][0];
    expect(arg.email).toBe("buyer@x.com");
    expect(arg.jobs).toHaveLength(3);
    expect(arg.loginUrl).toContain("/account/verify");
  });

  it("stays ready even if the email/index step throws", async () => {
    getSession.mockResolvedValueOnce({ ...SESSION, email: "buyer@x.com" });
    generateDesign.mockResolvedValue("data:image/png;base64,QUJD");
    putResult.mockResolvedValue("https://blob/r.png");
    addSessionToAccount.mockRejectedValueOnce(new Error("shopify down"));

    await startGeneration("s1");

    const arg = upsertSession.mock.calls.at(-1)![0];
    expect(arg.status).toBe("ready");
  });

  it("skips email when no email is on the session", async () => {
    getSession.mockResolvedValueOnce(SESSION); // no email
    generateDesign.mockResolvedValue("data:image/png;base64,QUJD");
    putResult.mockResolvedValue("https://blob/r.png");
    await startGeneration("s1");
    expect(sendDesignsReady).not.toHaveBeenCalled();
  });
```

> Note: `magicLinkUrl` (from `./auth`) is left unmocked — it is pure and only needs `CUSTOMIZE_AUTH_SECRET` (absent in tests → still returns a valid string containing `/account/verify`). Set `process.env.NEXT_PUBLIC_SITE_URL` is optional; the URL falls back to `https://nailismo.com`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run lib/customize/generation.test.ts`
Expected: FAIL — `addSessionToAccount` / `sendDesignsReady` not called (hook not implemented).

- [ ] **Step 3: Write minimal implementation**

Add imports at the top of `generation.ts` (below the existing imports):

```ts
import { addSessionToAccount } from "./account";
import { sendDesignsReady } from "./email";
import { magicLinkUrl } from "./auth";
```

Replace the final block of `startGeneration` (the last `upsertSession` call) with:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run lib/customize/generation.test.ts`
Expected: PASS (existing tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/customize/generation.ts apps/web/lib/customize/generation.test.ts
git commit -m "feat(customize): index + email customer when designs are ready"
```

---

## Task 6: Verify route + request-link route

**Files:**
- Create: `apps/web/app/account/verify/route.ts`
- Create: `apps/web/app/api/account/request-link/route.ts`
- Test: `apps/web/app/api/account/request-link/route.test.ts`

`/account/verify` (GET) consumes the magic link → sets the cookie → redirects. `/api/account/request-link` (POST) emails a fresh link **only** if the email has designs, but always returns the same body (no existence leak).

- [ ] **Step 1: Write the failing test** (request-link only — the verify route is exercised in the live smoke)

```ts
// apps/web/app/api/account/request-link/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { listSessionIds } = vi.hoisted(() => ({ listSessionIds: vi.fn() }));
const { sendMagicLink } = vi.hoisted(() => ({ sendMagicLink: vi.fn() }));
vi.mock("@/lib/customize/account", () => ({ listSessionIds }));
vi.mock("@/lib/customize/email", () => ({ sendMagicLink }));

import { POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/account/request-link", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `1.2.3.${Math.random()}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.CUSTOMIZE_AUTH_SECRET = "s";
  listSessionIds.mockReset();
  sendMagicLink.mockReset();
});

describe("POST /api/account/request-link", () => {
  it("emails a link when the email has designs", async () => {
    listSessionIds.mockResolvedValueOnce(["s1"]);
    const res = await POST(post({ email: "a@b.com" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendMagicLink).toHaveBeenCalledTimes(1);
    expect(sendMagicLink.mock.calls[0][1]).toContain("/account/verify");
  });

  it("returns the same body but sends nothing when no designs exist", async () => {
    listSessionIds.mockResolvedValueOnce([]);
    const res = await POST(post({ email: "nobody@x.com" }));
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendMagicLink).not.toHaveBeenCalled();
  });

  it("returns ok for a missing/invalid email without sending", async () => {
    const res = await POST(post({}));
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendMagicLink).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run app/api/account/request-link/route.test.ts`
Expected: FAIL — `./route` does not exist.

- [ ] **Step 3: Write minimal implementation** (both routes)

```ts
// apps/web/app/account/verify/route.ts
// Magic-link landing: verify the token, set the login cookie, redirect to `next`.
import { NextResponse } from "next/server";
import { verifyToken, sessionCookieValue, cookieOptions, SESSION_COOKIE } from "@/lib/customize/auth";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const email = verifyToken(url.searchParams.get("token") ?? "");
  if (!email) {
    return NextResponse.redirect(new URL("/account/login?error=expired", base));
  }
  const nextParam = url.searchParams.get("next") || "/account/designs";
  // Open-redirect guard: only same-site relative paths.
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account/designs";
  const res = NextResponse.redirect(new URL(safeNext, base));
  res.cookies.set(SESSION_COOKIE, sessionCookieValue(email), cookieOptions);
  return res;
}
```

```ts
// apps/web/app/api/account/request-link/route.ts
// Passwordless login: email a fresh magic link IF the address has designs.
// Always responds {ok:true} — never reveal whether an account exists.
import { listSessionIds } from "@/lib/customize/account";
import { sendMagicLink } from "@/lib/customize/email";
import { magicLinkUrl } from "@/lib/customize/auth";
import { clientIp, rateLimited } from "@/lib/customize/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(`reqlink:${clientIp(req)}`, 5)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }
  let body: { email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: true });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return Response.json({ ok: true });
  try {
    const ids = await listSessionIds(email);
    if (ids.length) {
      await sendMagicLink(email, magicLinkUrl(email, "/account/designs"));
    }
  } catch {
    // swallow — uniform response regardless
  }
  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run app/api/account/request-link/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/account/verify/route.ts apps/web/app/api/account/request-link/route.ts apps/web/app/api/account/request-link/route.test.ts
git commit -m "feat(customize): magic-link verify + request-link routes"
```

---

## Task 7: Account pages (login form + designs list) + result nav link

**Files:**
- Create: `apps/web/app/account/login/page.tsx`
- Create: `apps/web/app/account/designs/page.tsx`
- Modify: `apps/web/app/customize/result/[sessionId]/ResultPicker.tsx`

> **Frontend (FRONTDESIGN.md):** before writing these pages, invoke the `frontend-design` skill and match the existing Customize studio aesthetic. Read `app/customize/CustomizeStudio.tsx` and `ResultPicker.tsx` for the `candy-*` class vocabulary and reuse it (lime accent `#9FED40`, rounded pill buttons, layered tinted shadows — no default blue, no `transition-all`). Per memory: **no auto-screenshots** — give the user the URL to check, don't run the screenshot loop.

- [ ] **Step 1: Login form page** (client component; posts to request-link, shows confirmation)

```tsx
// apps/web/app/account/login/page.tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/account/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setBusy(false);
      setSent(true); // uniform UX regardless of whether an account exists
    }
  }

  return (
    <main className="candy-shell" style={{ maxWidth: 440, margin: "0 auto", padding: "64px 20px" }}>
      <h1 className="candy-h1">Your designs</h1>
      {sent ? (
        <p className="candy-body">
          If you’ve created designs with that email, we just sent you a sign-in link. Check your inbox.
        </p>
      ) : (
        <form onSubmit={submit} className="candy-form">
          <p className="candy-body">Enter your email and we’ll send you a link to view your custom nail designs.</p>
          <label className="candy-label" htmlFor="acct-email">Email</label>
          <input
            id="acct-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="candy-input"
          />
          <button type="submit" disabled={busy} className="candy-cta">
            {busy ? "Sending…" : "Email me my designs"}
          </button>
        </form>
      )}
    </main>
  );
}
```

> If a `candy-*` class referenced above does not exist, substitute the nearest existing class found in `CustomizeStudio.tsx` (this is the one place to adapt to the real class names — verify against that file while implementing).

- [ ] **Step 2: Designs list page** (server component; gated)

```tsx
// apps/web/app/account/designs/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionEmail } from "@/lib/customize/auth";
import { listSessionIds } from "@/lib/customize/account";
import { getSession } from "@/lib/customize/session";

export const dynamic = "force-dynamic"; // reads the per-user cookie
export const metadata: Metadata = {
  title: "My designs | Nailismo",
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready — pick your favorite",
  selected: "Design chosen — finish checkout",
  ordered: "Ordered 🎉",
  generating: "Generating…",
  pending_payment: "Awaiting deposit",
  refunded: "Refunded",
  failed: "Generation failed",
};

export default async function DesignsPage() {
  const email = await readSessionEmail();
  if (!email) redirect("/account/login");

  const ids = await listSessionIds(email);
  const sessions = (await Promise.all(ids.map((id) => getSession(id).catch(() => null)))).filter(
    (s): s is NonNullable<typeof s> => s != null,
  );

  return (
    <main className="candy-shell" style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px" }}>
      <h1 className="candy-h1">My designs</h1>
      {sessions.length === 0 ? (
        <p className="candy-body">
          No designs yet. <Link href="/customize">Start your custom set →</Link>
        </p>
      ) : (
        <ul style={{ display: "grid", gap: 16, listStyle: "none", padding: 0 }}>
          {sessions.map((s) => {
            const thumb = s.jobs?.find((j) => j.status === "ready" && j.resultUrl)?.resultUrl;
            return (
              <li key={s.sessionId}>
                <Link
                  href={`/customize/result/${s.sessionId}`}
                  style={{ display: "flex", gap: 16, alignItems: "center", textDecoration: "none", color: "inherit" }}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" width={84} height={84} style={{ borderRadius: 14, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 84, height: 84, borderRadius: 14, background: "#f1f1f1" }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{STATUS_LABEL[s.status] ?? s.status}</div>
                    <div style={{ color: "#666", fontSize: 14 }}>Resume →</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Add a "My designs" link in the result header**

In `ResultPicker.tsx`, add a small nav link to `/account/designs` near the top of the rendered output (match surrounding markup/classes). Minimal example to adapt:

```tsx
import Link from "next/link";
// ...inside the returned JSX, near the header:
<Link href="/account/designs" className="candy-link" style={{ fontSize: 14 }}>
  My designs →
</Link>
```

- [ ] **Step 4: Typecheck + build the routes**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/account/login/page.tsx apps/web/app/account/designs/page.tsx apps/web/app/customize/result/[sessionId]/ResultPicker.tsx
git commit -m "feat(customize): account login form + gated designs list + result nav link"
```

---

## Task 8: Secrets + env

**Files:** none (env + Vercel).

- [ ] **Step 1: Generate the auth secret and add it locally**

```bash
echo "CUSTOMIZE_AUTH_SECRET=$(openssl rand -hex 32)" >> apps/web/.env.local
```

- [ ] **Step 2: Push both secrets to Vercel prod** (so the deployed build has them)

`RESEND_API_KEY` and `CUSTOMIZE_AUTH_SECRET` must exist in Vercel Production. Read the values from `apps/web/.env.local` and add them (all `vercel` calls require `--scope nailismo`):

```bash
# from the value in apps/web/.env.local — never echo the value to logs
vercel env add CUSTOMIZE_AUTH_SECRET production --scope nailismo
vercel env add RESEND_API_KEY production --scope nailismo
```

- [ ] **Step 3: Verify presence (names only)**

```bash
vercel env ls production --scope nailismo | grep -E "CUSTOMIZE_AUTH_SECRET|RESEND_API_KEY"
```
Expected: both names listed. (Env changes bind on the next deployment.)

---

## Task 9: Full verification + ship

**Files:** none.

- [ ] **Step 1: Run the full customize test suite + typecheck**

Run: `cd apps/web && pnpm vitest run lib/customize app/api/account && pnpm exec tsc --noEmit`
Expected: all pass, no type errors.

- [ ] **Step 2: Live email smoke** (real Resend send to the user's address)

Write a throwaway `.tmp/smoke_email.ts` that calls `sendDesignsReady` with `email: "xutsiang@gmail.com"`, three dummy `resultUrl`s, and a real `magicLinkUrl(...)`; run with `pnpm tsx`. Confirm: HTTP ok, the email arrives from `hello@nailismo.com`, the button link opens `/account/verify`, hitting it sets the cookie and lands on `/account/designs`. Delete the smoke file after.

> Requires `RESEND_API_KEY` + a verified `nailismo.com` sender domain in Resend. If the send 403s on domain verification, that DNS step is the blocker — surface it to the user.

- [ ] **Step 3: Push the branch and open a PR**

```bash
git push -u origin feat/customize-account-magic-link
gh pr create --title "feat(customize): personal account, email delivery & resume" --body "$(cat <<'EOF'
Magic-link account for the Customize studio: emails the customer their 3 designs + a passwordless sign-in link when generation completes, and a gated /account/designs page that resumes via the existing result page.

- HMAC magic-link token + signed cookie (no DB)
- Resend transactional email (REST, no new dep), sender hello@nailismo.com
- customize_account metaobject indexes email -> sessionIds
- /account/login (request link), /account/verify (consume link), /account/designs (gated list)
- Hook in startGeneration fires index + email on ready (best-effort)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Confirm prod deploy + new env bound**

After merge → auto prod deploy. Verify the deployment reaches Ready (`vercel ls --scope nailismo`) and that a real end-to-end run (upload → $2 test card → webhook → email arrives → click link → see designs) works on prod.

---

## Self-review notes

- **Spec coverage:** magic-link auth (T1), email send (T4), index (T2/T3), gated list + resume (T7), ready-hook (T5), login routes (T6), security/env (T6/T8), testing (T1–T6). All spec sections mapped.
- **Path conflict avoided:** verification lives at `/account/verify` (route handler) and the form at `/account/login` (page) — never the same path as both route + page.
- **Type consistency:** `magicLinkUrl(email, next)`, `verifyToken→string|null`, `sessionCookieValue`, `cookieOptions`, `SESSION_COOKIE`, `addSessionToAccount(email, sessionId)`, `listSessionIds(email)→string[]`, `sendDesignsReady({email,jobs,loginUrl})`, `sendMagicLink(email, loginUrl)` — used identically across tasks.
- **Result page stays public** (shareable); only `/account/designs` is gated — matches spec.
