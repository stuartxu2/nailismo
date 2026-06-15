# Customize-to-Order — Personal Account, Email Delivery & Resume

> Design spec. Brainstormed and approved 2026-06-15. Next: implementation plan (writing-plans).

## Goal

When a customer's 3 custom-nail designs finish generating, **email them their designs plus a login link**. The customer can **log in to a personal page that lists all their designs** and **resume the order** (pick a design → checkout) from there.

## What already exists (reuse, do not rebuild)

- **Session storage** — Shopify `customize_session` metaobject, one per session, keyed by `sessionId` (handle). CRUD in `lib/customize/session.ts`.
- **Email is already captured** at the upload step (`CustomizeStudio.tsx` → `POST /api/customize/upload` → stored on the session's `email` field).
- **The result page is already built and shareable** — `/customize/result/[sessionId]` renders the 3 designs and does pick → `$2`-off checkout. It persists indefinitely.
- **Generation orchestration** — `lib/customize/generation.ts` `startGeneration()`, run from the Stripe webhook via `after()`, sets the session to `ready` once designs land.

So the customer-facing *content* already persists and is viewable by URL. The new work is an **email send**, a **thin auth layer**, and an **aggregate "my designs" page**.

## Decisions (locked)

- **Login model: magic-link (passwordless).** The "registration link" in the email *is* the magic link. No passwords, no Shopify Customer Accounts OAuth.
- **Email provider: Resend**, called via its REST API (no new npm dependency). Sender: `hello@nailismo.com`. Key: `RESEND_API_KEY` (already in `.env.local`).
- **v1 sends on the success path only** — no "generation failed" email (the failure path already refunds the deposit).
- **Listing mechanism: a dedicated email→sessions index metaobject** (not a metaobject field-query, which is unreliable on Shopify).

## Architecture

Four new units, one hook into existing code.

### 1. `lib/customize/auth.ts` — stateless magic-link tokens + cookie
- `signToken(email, ttlSeconds)` / `verifyToken(token)` → HMAC-SHA256 over `{email, exp}` with `CUSTOMIZE_AUTH_SECRET`. Self-verifying; no storage.
- `setSessionCookie(email)` / `readSessionEmail()` — httpOnly, secure, `sameSite=lax`, signed, ~30-day cookie holding the logged-in email. Uses Next 16 `cookies()`.
- Verify rejects: bad signature, expired `exp`, malformed payload.

### 2. `lib/customize/email.ts` — Resend send
- `sendDesignsReady(email, sessionId, jobs, loginUrl)` — POST `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}`, `from: "Nailismo <hello@nailismo.com>"`.
- HTML body: the 3 design thumbnails (public Blob `resultUrl`s), a **"View & finish your order"** button (the magic link → result page), and the "$2 already credited to your $69 order" reminder. Plain-string HTML template (no react-email dep).
- Returns success/failure; never throws to the caller's critical path.

### 3. `lib/customize/account.ts` — email→sessions index
- New metaobject type **`customize_account`**: handle `acct-<hmac8(email)>`, fields `email` (string) + `session_ids` (JSON string array).
- `addSessionToAccount(email, sessionId)` — read-modify-upsert, **deduped** (idempotent for webhook retries).
- `listSessionIds(email)` — returns the array (or `[]`).
- A one-time metaobject **definition** must be created in Shopify (via a `tools/` script or `graphql_mutation`), mirroring how `customize_session` was defined.

### 4. Routes / pages
- `GET /account/login` (route handler) — `?token=&next=` → `verifyToken` → `setSessionCookie` → redirect to `next` (default `/account/designs`). Invalid/expired token → bounce to the login page with an error flag.
- `/account/login` (page) — email input → `POST /api/account/request-link`.
- `POST /api/account/request-link` — rate-limited (reuse `ratelimit.ts`); if the email has an account index, email a fresh magic link to `/account/designs`. **Always** returns the same "if you have designs, we sent a link" response (no email-existence leak).
- `/account/designs` (server component) — `readSessionEmail()`; if absent → redirect to `/account/login`. Else `listSessionIds` → fetch each session → render cards (thumbnail, status, **Resume** link to `/customize/result/[sessionId]`). Gated to the cookie's email.

### Hook into `generation.ts`
- After the final `upsertSession({ status: "ready" })`, if `session.email`: `await addSessionToAccount(email, sessionId)` then `sendDesignsReady(...)`, both wrapped in try/catch so neither can break generation or the refund path.

## Data flow

```
generation ready ──▶ addSessionToAccount(email,id) ──▶ sendDesignsReady(email,id,jobs, magic-link)
                                                              │
                                       email: 3 thumbs + [View & finish] (token→/login→cookie→result)
                                                              │
customer clicks ─▶ GET /account/login?token&next ─▶ verify ─▶ set cookie ─▶ /customize/result/[id] (pick→checkout)
                                                                        └─ nav: /account/designs (all sessions)

later / lost email ─▶ /account/login (enter email) ─▶ POST request-link ─▶ fresh magic link emailed
```

## Security

- HMAC-signed tokens and cookie; constant-time compare on verify.
- Token TTL (≈30 days for the in-email link). Cookie httpOnly/secure/sameSite=lax.
- No card data ever in scope (stays on Stripe / Shopify).
- `request-link` is rate-limited and does not reveal whether an email exists.
- The aggregate `/account/designs` is gated to the cookie email; individual result pages remain public/shareable by design (the plan's "send to a friend to vote" viral loop).
- `CUSTOMIZE_AUTH_SECRET` and `RESEND_API_KEY` live in `.env.local` / Vercel env; never logged.

## Testing (co-located Vitest, matching repo conventions)

- `auth.test.ts` — token sign→verify round-trip; reject expired, tampered, malformed; cookie value round-trip.
- `account.test.ts` — add creates index; add is deduped/idempotent; list returns ids; handle derivation stable.
- `email.test.ts` — template contains the magic link, all 3 thumbnails, the credit line; Resend POST shape (mocked fetch); send failure is swallowed.
- `generation.test.ts` — extend: on ready with an email, `addSessionToAccount` + `sendDesignsReady` are called; email/index failure does not flip status away from `ready`.
- `request-link` route — uniform response regardless of account existence; rate-limit path.

## Out of scope (v1)

- "Generation failed" email.
- Shopify Customer Account linking / order history.
- Editing a design after generation (resume = pick + checkout only).
- Password auth, multi-device session management beyond the signed cookie.

## External setup required (user)

- Resend account + verified sending domain for `hello@nailismo.com` (DNS via Fastmail). `RESEND_API_KEY` — done.
- `CUSTOMIZE_AUTH_SECRET` — generated during implementation, added to `.env.local` + Vercel prod.
- Create the `customize_account` metaobject definition in Shopify (implementation step).
