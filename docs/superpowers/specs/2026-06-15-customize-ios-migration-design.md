# Customize to Order — iOS app migration

**Date:** 2026-06-15
**Status:** Approved (brainstorm)
**Scope:** Bring the web "Customize to Order" AI nail studio to the native iOS app (`apps/ios`). Android (`apps/app`) is out of scope.

---

## 1. Goal

Native iOS parity for the customize flow: upload an inspo image → pay a $2 deposit → AI generates one custom set shown 3 ways → pick a size → Shopify-hosted checkout (the $2 is credited). Plus a native "My designs" history/resume list for signed-in customers.

Success criteria:
- A customer can complete intake → $2 payment → generation → checkout entirely inside the iOS app, with only the final Shopify checkout in in-app Safari (matches existing cart behavior).
- A signed-in customer can see and resume their past sessions in a native "My designs" screen.
- No customize business logic is reimplemented natively — the app consumes the existing web BFF.

---

## 2. Guiding principle — reuse the web BFF, build native UI only

All heavy/secret logic stays server-side and is already client-agnostic: image moderation + `{REF}` extraction (Gemini via AI Gateway), Stripe PaymentIntent creation, webhook-triggered generation, discount minting, Shopify checkout creation, and the account metaobject index. iOS calls the **same endpoints the web does**, plus **one new JSON endpoint** for "My designs".

### Endpoints reused unchanged

| Method | Path | Body → Response |
|---|---|---|
| POST | `/api/customize/upload` | `{ image: dataURL, shape: "<Length> <Shape>", note, email }` → `{ sessionId, uploadUrl }` |
| POST | `/api/customize/intent` | `{ sessionId }` → `{ clientSecret }` ($2 PaymentIntent) |
| GET | `/api/customize/status/{sessionId}` | → `{ status, jobs: [{ status, resultUrl? }] }` |
| POST | `/api/customize/select` | `{ sessionId, size }` → `{ checkoutUrl }` |

`shape` is the combined `"<Length> <Shape>"` string the web sends (e.g. `"Medium Almond"`). `image` is a `data:image/jpeg;base64,…` data URL (the upload route accepts both data-URL and raw base64; send the data URL to match the web).

### New endpoint (only web addition)

| Method | Path | Auth → Response |
|---|---|---|
| GET | `/api/customize/designs` | Header `x-shopify-customer-token: <storefront customerAccessToken>` → `{ designs: [{ sessionId, status, thumbUrl? }] }` |

Behavior:
1. Read the customer token from the header. If missing → `401`.
2. Resolve the token → email via the Storefront `customer(customerAccessToken:)` query (server-side, public Storefront token). If invalid/expired → `401`.
3. `listSessionIds(email)` from the existing `customize_account` metaobject index, then `getSession` each, mapping to `{ sessionId, status, thumbUrl }` where `thumbUrl` = first ready job's `resultUrl`. Tolerate per-session fetch failures (filter nulls), same as the web `/account/designs` page.
4. `Cache-Control: no-store`.

Rationale: the web "My designs" page is cookie-gated SSR backed by a stateless HMAC magic-link. The app already holds a Shopify `customerAccessToken` in the Keychain (`AuthStore`), so token-auth is the natural native path and avoids threading the web cookie into `URLSession`. New code is ~30 lines and introduces no new auth concept. Sessions are already indexed by email in `generation.ts` (`addSessionToAccount`) when an email was provided at intake.

---

## 3. Native module structure

New files under `apps/ios/Nailismo/`:

### Core / networking
- `Core/CustomizeClient.swift` — typed `URLSession` wrapper over the five endpoints, styled after `HTTPScanProvider`. Decodable models: `UploadResp`, `IntentResp`, `StatusResp`, `Job`, `SelectResp`, `DesignSummary`. Uses `Config.scanHost` as the API host. Maps non-2xx to a `CustomizeError` carrying status code + server `error` string for inline copy.
- `Stores/CustomizeStore.swift` — `@MainActor @Observable` state machine for a single session. `phase` enum: `intake`, `uploading`, `paying`, `generating`, `ready`, `checkout`, `failed`. Holds `sessionId`, `clientSecret`, `jobs`, `selectedSize`, `errorMessage`. Drives status polling every 2500ms (web `POLL_MS`), stops on terminal status (`ready`/`selected`/`ordered`/`failed`/`refunded`). One store instance per active flow.

### Views — `Features/Customize/`
- `CustomizeView.swift` — root container; switches subview on `store.phase`.
- `CustomizeIntakeView.swift` — image source (PHPicker photo library + camera via existing `CameraPicker`), Length chips (Short/Medium/Long), Shape chips (Almond/Coffin/Square/Round), optional note (maxLength 120), email field prefilled from `AuthStore.customer.email` when signed in. Image downscaled to ≤1280px JPEG (`UIImage.processedForScan`, quality ~0.72) then base64 data URL. Submit → `/upload` → `/intent` → advance to `paying`.
- `CustomizePayView.swift` — presents Stripe `PaymentSheet` with `clientSecret`. On `.completed` → `generating` + start poll. On `.canceled`/`.failed` → back to `intake` (no charge; session stays `pending_payment`).
- `CustomizeResultView.swift` — 3-view grid (The set / On your hand / Your kit) with shimmer placeholders for pending jobs; failed-view fallback. When `ready` + has design: size picker (S/M/L/XL), price summary ($69.00 / −$2.00 / You pay today $67.00), "Order my custom set" → `/select` → open `checkoutUrl` in existing `SafariView`. "Measure your nails" link → Measure tab. `failed`/`refunded` → refund message + Start over.
- `MyDesignsView.swift` — list of `DesignSummary` (thumb + status label + "Resume →"). Tap → `CustomizeResultView` for that `sessionId`. Requires sign-in; when signed out, show a prompt to sign in (reuse `AuthView`). Empty state → "Start your custom set".

### Entry points (all four)
- New `.customize` case in `Tab` + `CandyTabBar` item (`RootTabView.swift`).
- Home banner/hero card → `CustomizeView` (`HomeView`).
- Shop section tile → `CustomizeView` (`ShopView`).
- Account row "My custom designs" → `MyDesignsView` (`AccountView`).

Tab-bar note: 6 items + the raised Measure FAB is tight on small iPhones (SE). Use an abbreviated label ("Custom") and slightly reduced horizontal padding. Accepted tradeoff (user chose the tab).

---

## 4. Stripe SDK integration

- Add `stripe-ios` via SPM in `apps/ios/project.yml` (new `packages:` block), depending on the **StripePaymentSheet** product only (lighter than the umbrella `Stripe`). First external dependency in the iOS target. The SDK ships its own Privacy Manifest (`StripeCore` data collection) — no extra manifest work, but note it for App Store review.
- New runtime config in `Secrets.xcconfig` (+ `Secrets.example.xcconfig`) surfaced through `Config.swift`:
  - `StripePublishableKey` — the same `pk_…` the web uses (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
  - API host reuses the existing `ScanApiHost` (default `nailismo.com`).
- Payment: after `/intent`, set `STPAPIClient.shared.publishableKey`, build `PaymentSheet(paymentIntentClientSecret:)` with a Candy-tinted `PaymentSheet.Configuration` (merchant display name "Nailismo"), present from `CustomizePayView`.
- **Generation is triggered server-side by the existing Stripe webhook** — the app never triggers generation, only polls `/status`. Identical to web.
- App Store compliance: the $2 deposit is credited toward a physical, hand-made product (physical goods/services), which is **exempt from IAP**; card payment via Stripe is allowed.

---

## 5. Data flow

```
Intake (image + length/shape/note/email)
  → POST /upload           → sessionId
  → POST /intent           → clientSecret
  → Stripe PaymentSheet ($2)
     └─(Stripe webhook, server-side)→ generation starts
  → poll GET /status (2.5s) until terminal
  → jobs ready → pick size → POST /select → checkoutUrl
  → SafariView(checkoutUrl)  (Shopify-hosted, $2 credited via discount code)

My designs (signed in):
  GET /api/customize/designs (x-shopify-customer-token)
  → list → tap → CustomizeResultView(sessionId) [resume]
```

---

## 6. Error handling (mirror web copy)

| Condition | Behavior |
|---|---|
| Upload moderation reject (422) | Inline message from server `error`, stay on intake |
| Image too large (413) | Re-downscale / "try a smaller image" |
| Rate limited (429) | "Too many tries — give it a sec." |
| Payment canceled/failed | Back to intake, no charge |
| Status `failed` / `refunded` | "That render didn't work out. Your $2 has been refunded." + Start over |
| Poll 404 | "We couldn't find that session." |
| Network error | Retry button; polling self-retries (like web) |
| My designs, signed out | Sign-in prompt (reuse `AuthView`) |
| My designs, 401 | Treat as signed-out → prompt re-auth |

---

## 7. Testing

- **Swift** — `CustomizeStoreTests` (XCTest, simulator, no signing per Pass 1): phase transitions, polling stops on terminal status, order button gated on size selected, error mapping. Mock `CustomizeClient` via a protocol so the store is testable without network.
- **Web** — `app/api/customize/designs/route.test.ts` (Vitest, matches existing route tests): valid token → summaries; missing/invalid token → 401; tolerates per-session fetch failures.
- **Manual verify** — simulator run intake → Stripe test card (`4242…`) → generating → checkout. No automated screenshot loop (per user preference); provide build/run steps for manual eyeballing.

---

## 8. Out of scope (v1)

- In-app magic-link / passwordless auth (native uses the existing Shopify customer token).
- Push notification on "design ready" (poll only).
- Android (`apps/app`).
- Any change to web customize UI or the generation pipeline.
