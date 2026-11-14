# Holiday Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship "Any 3 sets for $45" (Every Possible Discount, automatic), a Holiday Gift Guide collection, date-aware US Christmas cutoff messaging, and cart savings/progress/suggestions.

**Architecture:**
- **Shopify side:** a tag (`Nail Set`) plus a hidden smart collection (`nail-sets`) define eligibility. The owner points an EPD "Buy X for $Y" rule at that collection. A re-runnable Storefront-cart script proves the cart prices it before any offer UI ships.
- **Site side:** one pure, unit-tested promo-config module (`lib/promo/holiday.ts`) decides what is live at time T. The ticker, nav, homepage band, gift-guide strip, PDP and cart read it. The root layout revalidates hourly so copy switches on time.

**Tech Stack:** Next.js 16 App Router (no Cache Components → segment `revalidate` works), Shopify Storefront + Admin GraphQL, Python 3 tools (`uvx pytest`, `uvx ruff`), Vitest, Playwright against Vercel previews.

**Spec:** `docs/superpowers/specs/2026-11-14-holiday-package-design.md`

## Global Constraints

- Offer: any 3 eligible sets → **$45.00** total; repeats per 3; live now → **2026-12-15 23:59 PT** (`2026-12-16T08:00:00Z` exclusive end).
- Eligibility: ACTIVE, not gift card, handle ∉ {`nail-glue`, `glue-remover`, `custom-nail-set`}, min variant price **> $15**. Tag: `Nail Set`. Collection handle: `nail-sets`, **unpublished** (hidden from storefront, sitemap, menus).
- Cutoffs (2pm ET): Standard `2026-12-14T19:00:00Z`, Express `2026-12-21T19:00:00Z`. Season end: `2026-12-26T08:00:00Z` (Dec 26 00:00 PT). Black Friday label window: `2026-11-27T08:00:00Z` → `2026-12-01T08:00:00Z`.
- Cutoff copy is labelled US. No countdowns, no stock claims, no "guaranteed".
- Gift guide collection handle: `holiday-gift-guide`, title "Holiday Gift Guide". The Shopify description is undated; dated lines come from code.
- **Offer UI must not deploy before Task 2's gate passes.**
- **Do not run `next dev` / `next build` locally** (freezes the machine). Local checks: `nice -n 10 npx vitest run --maxWorkers=2`, `nice -n 10 npx tsc --noEmit -p .`, eslint on touched files. Visual/E2E checks run on the Vercel preview (`PLAYWRIGHT_BASE_URL`, bypass secret from `apps/web/.env.local`, `--workers=2`).
- Shopify writes only through dry-run-first, idempotent tools in `tools/`. Never print secrets.
- Commits: Conventional Commits, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never stage the owner's unrelated uncommitted files (apps/ios, customize OTP work, brand_assets, etc.).

## Review Focus

1. **A cart with a gift card or glue plus 2 sets** must get no discount and show no "applied" savings; progress must count sets only. → Task 2 case, Task 6 `countEligibleSets` test.
2. **4 or 5 sets in cart** (one bundle + leftovers) must show the savings *and* a "1 more / 2 more for another 3-pack" nudge, not "applied" alone. → Task 6 `bundleNudge` tests.
3. **Same set ×3** (one line, quantity 3) counts as 3. → Task 2 case, Task 6 test (quantity-weighted).
4. **Boundary instants** (exactly at a cutoff or the offer end) flip to the next state, with no gap or overlap. → Task 3 boundary tests.
5. **Gift card PDP / glue PDP** never shows the offer chip or bundle nudge. → Task 3 `isBundleEligible` test + Task 7 E2E (both PDPs).

---

### Task 1: Eligibility tag + hidden `nail-sets` collection

**Files:**
- Create: `tools/shopify_nail_set_tag.py`, `tools/test_shopify_nail_set_tag.py`
- Modify: `workflows/sync_new_products.md` (add step after "Refresh New Drops": run this tool)

**Interfaces:**
- Consumes: `plan_changes(products, selected, tag)` and `EXCLUDED_HANDLES` from `tools/shopify_new_drops_refresh.py`; `load_env`, `get_admin_token` from `tools/shopify_auth.py`.
- Produces: tag `Nail Set` on eligible products; smart collection `nail-sets` (rule `TAG EQUALS "Nail Set"`, not published to any channel). Constants `TAG = "Nail Set"`, `COLLECTION_HANDLE = "nail-sets"`, `MIN_PRICE = 15.0`.

- [ ] **Step 1: Write failing tests** — `test_select_nail_sets_filters_inactive_gift_excluded_and_cheap`: given products (ACTIVE $17.99 ✓, ACTIVE $24.99 ✓, DRAFT $17.99 ✗, gift card ✗, `nail-glue` $6.99 ✗, `custom-nail-set` $69 ✗, ACTIVE $12.99 ✗), `select_nail_sets(products)` returns exactly the two ✓ handles. `test_select_nail_sets_price_boundary`: a $15.00 set is excluded, a $15.01 set is included. Product dicts carry `id, handle, tags, status, isGiftCard, priceRangeV2.minVariantPrice.amount` (string).
- [ ] **Step 2: Run** `cd tools && nice -n 10 uvx pytest -q test_shopify_nail_set_tag.py` → FAIL (module missing).
- [ ] **Step 3: Implement** `select_nail_sets(products: list[Product]) -> list[Product]` and a `main()` mirroring `shopify_new_drops_refresh.py`:
  - CLI: `--apply`, dry-run by default.
  - Plan and apply tag add/remove via `plan_changes`.
  - Ensure the collection: look it up with `collectionByIdentifier(identifier:{handle})`. If missing, create it with `collectionCreate`, using `ruleSet {appliedDisjunctively:false, rules:[{column:TAG, relation:EQUALS, condition:"Nail Set"}]}`, title "Nail Sets (bundle eligibility)" and handle `nail-sets`. Do not publish it.
  - Print the plan.
  - Exit non-zero on any `userErrors`.
- [ ] **Step 4: Run tests + lint** → `uvx pytest` PASS; `uvx ruff check shopify_nail_set_tag.py test_shopify_nail_set_tag.py` → "All checks passed!" (`chmod +x` the tool).
- [ ] **Step 5: Dry-run, then apply** — `nice -n 10 python3 tools/shopify_nail_set_tag.py`. Expect 43 sets planned (all ACTIVE products except gift card, glue, remover, Custom Nail Set). Then run with `--apply`. Re-run the dry-run and expect `0 add, 0 remove, collection exists`.
- [ ] **Step 6: Verify** with an Admin query: `collectionByIdentifier(identifier:{handle:"nail-sets"}) { products(first:100){nodes{handle}} resourcePublicationsCount { count } }`. Expect 43 handles and 0 publications. Also check the storefront: `curl -s https://nailismo.com/collections/nail-sets` returns 404.
- [ ] **Step 7: Update workflow step + commit** — `feat(tools): tag bundle-eligible nail sets and hidden nail-sets collection`.

### Task 2: Owner configures EPD + cart verification gate

**Files:**
- Create: `tools/verify_bundle_discount.py`, `tools/test_verify_bundle_discount.py`

**Interfaces:**
- Consumes: Storefront API (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_API_VERSION`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` via `load_env`); the `nail-sets` collection from Task 1.
- Produces: a pass/fail report. **Tasks 4–6 merge only if it passes.**

- [ ] **Step 1: Owner action — send the owner these exact EPD settings, then wait for "done":**
  - Type "Buy X for $Y" (fixed price).
  - Quantity **3**, price **$45.00**, qualifying collection **"Nail Sets (bundle eligibility)"**.
  - Automatic (no code). Starts now, ends **Dec 15 2026 11:59 PM PT**.
  - Apply multiple times per order: **on**.
  - Combine with shipping discounts: **yes**. With product/order discounts: **no**.
  - If offered, choose "discount the highest-priced items first".
- [ ] **Step 2: Write failing tests** for the pure helper `summarize(cart: dict) -> tuple[float, float]`, which returns `(total, savings)`. It reads `cart.cost.totalAmount.amount` and sums `discountAllocations[].discountedAmount.amount` across cart and lines.
  - `test_summarize_sums_line_and_cart_allocations` — a fixture with 1 cart allocation of 3.00 and 2 line allocations of 2.50 each → savings 8.00.
  - `test_summarize_no_allocations` → savings 0.0.
- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** `summarize` plus `main()`. For each case, `main()` creates a fresh cart (`cartCreate` with lines; first variant of each handle via `productByHandle`), reads it back with `discountAllocations` on cart and lines, and compares savings to expected (±0.01). Print a table and exit 1 on any mismatch.

  | Case | Lines | Expected savings |
  |---|---|---|
  | two_sets | midnight-circuit, monochrome-edge | 0.00 |
  | three_core | midnight-circuit, monochrome-edge, rebel-king | 8.97 |
  | same_set_x3 | midnight-circuit ×3 | 8.97 |
  | mixed_three | midnight-circuit, monochrome-edge, molten-steel | 15.97 |
  | three_premium | molten-steel, urban-jungle, power-up | 29.97 |
  | four_core | midnight-circuit, monochrome-edge, rebel-king, safari-stripes | 8.97 |
  | six_core | 6 distinct $17.99 handles | 17.94 |
  | gift_plus_two | nailismo-gift-card ($25 variant), midnight-circuit, monochrome-edge | 0.00 |
  | glue_plus_two | nail-glue, midnight-circuit, monochrome-edge | 0.00 |
  | mixed_four (report only) | molten-steel, urban-jungle, power-up, midnight-circuit | 29.97 if highest-first, 22.97 if cheapest-first — record which |

- [ ] **Step 5: Run tests + ruff** → PASS.
- [ ] **Step 6: GATE — run live** `nice -n 10 python3 tools/verify_bundle_discount.py`.
  - All non-report cases must PASS.
  - **If any fail: stop all offer-UI work and report to the owner** (options: Appstle + 3-pack page, or native "Buy 3+, 20% off").
  - Record the `mixed_four` behaviour in the spec's §1 "mixed prices" line.
- [ ] **Step 7: Commit** — `feat(tools): add Storefront cart check for the 3-for-$45 discount`.

### Task 3: Promo config module

**Files:**
- Create: `apps/web/lib/promo/holiday.ts`, `apps/web/lib/promo/holiday.test.ts`

**Interfaces:**
- Produces:
  - `BUNDLE_TAG = "Nail Set"`, `BUNDLE_SIZE = 3`, `BUNDLE_PRICE = 45`, `OFFER_END`, `STANDARD_CUTOFF`, `EXPRESS_CUTOFF`, `SEASON_END`, `BF_START`, `BF_END` (all `Date`, values from Global Constraints).
  - `type PromoState = { offerLive: boolean; seasonLive: boolean; blackFriday: boolean; cutoff: "standard" | "express" | "giftcard" | null }`
  - `getPromoState(now: Date): PromoState`
  - `cutoffMessage(c: PromoState["cutoff"]): string | null`
  - `isBundleEligible(tags: readonly string[]): boolean`
  - `OFFER_LABEL = "Any 3 sets for $45"`

- [ ] **Step 1: Write failing tests** (Vitest):
  - `getPromoState(new Date("2026-11-20T12:00:00Z"))` → `{offerLive:true, seasonLive:true, blackFriday:false, cutoff:"standard"}`.
  - Black Friday: `2026-11-27T08:00:00Z` → `blackFriday:true`; `2026-12-01T08:00:00Z` → `false`.
  - Cutoff boundaries:
    - `2026-12-14T18:59:59Z` → `"standard"`
    - `2026-12-14T19:00:00Z` → `"express"`
    - `2026-12-21T19:00:00Z` → `"giftcard"`
  - Offer end: `2026-12-16T07:59:59Z` → `offerLive:true`; `2026-12-16T08:00:00Z` → `offerLive:false`, `seasonLive:true`.
  - Season end: `2026-12-26T08:00:00Z` → `{offerLive:false, seasonLive:false, blackFriday:false, cutoff:null}`.
  - `cutoffMessage` exact strings:
    - `"standard"` → `"US: order by Mon Dec 14 for Christmas delivery"`
    - `"express"` → `"US: order with Express by Mon Dec 21 for Christmas delivery"`
    - `"giftcard"` → `"Running late? Gift cards deliver instantly"`
    - `null` → `null`
  - `isBundleEligible(["Nail Set","Blue"])` → true; `isBundleEligible(["Blue"])` → false.
- [ ] **Step 2: Run** `cd apps/web && nice -n 10 npx vitest run lib/promo/holiday.test.ts` → FAIL.
- [ ] **Step 3: Implement** with half-open intervals `[start, end)` throughout.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(web): add holiday promo config module`.

### Task 4: Holiday Gift Guide collection + page strip

**Files:**
- Create: `tools/shopify_gift_guide.py`
- Create: `apps/web/app/components/PromoStrip.tsx`
- Modify: `apps/web/app/collections/[handle]/page.tsx` (render `<PromoStrip />` under the page head when `collection.handle === "holiday-gift-guide"`)

**Interfaces:**
- Consumes: `getPromoState`, `cutoffMessage`, `OFFER_LABEL` (Task 3).
- Produces: a published manual collection `holiday-gift-guide`; component `PromoStrip({ now }: { now?: Date })`, a server component rendering the offer line (if `offerLive`) and the cutoff line (if any) linking to `/collections/holiday-gift-guide` / the gift card PDP for `"giftcard"`. It renders nothing when both are absent.

- [ ] **Step 1: Tool.** Idempotent, dry-run by default, `--apply`. It creates or updates a **manual** collection with:
  - handle `holiday-gift-guide`, title "Holiday Gift Guide"
  - an evergreen description (120–200 words, gender-neutral, no dates; suggests the gift card when unsure of size)
  - members:
    - holiday sets: `arctic-holiday`, `christmas-classics`, `first-frost`, `sweater-weather`
    - every product in `best-sellers` that is not a gift card (read at runtime)
    - `nailismo-gift-card`, `nail-glue`
  - publication to every publication returned by `publications(first:10)` — Online Store + Headless.

  Run `ruff`, then dry-run, then `--apply`, then re-run and expect no changes.
- [ ] **Step 2: Verify:** `curl -s -o /dev/null -w '%{http_code}' https://nailismo.com/collections/holiday-gift-guide` → `200`, and the page lists the members.
- [ ] **Step 3: PromoStrip.**
  - Server component; `now` defaults to `new Date()`.
  - Plum-ink text on a Lemon band, matching existing `.candy-sticker` / band styles. No new tokens.
  - No unit test: the logic lives in Task 3. Visual check comes in Task 7.
- [ ] **Step 4:** Type-check + eslint the touched files → 0 errors.
- [ ] **Step 5: Commit** — `feat: holiday gift guide collection and promo strip`.

### Task 5: Seasonal chrome (ticker, nav, footer, homepage band) + PDP chip/nudge

**Files:**
- Modify:
  - `apps/web/app/layout.tsx` (add `export const revalidate = 3600;`)
  - `apps/web/app/components/AnnouncementTicker.tsx`
  - `apps/web/app/components/Header.tsx:47-49`, `apps/web/app/components/MobileMenu.tsx:87-105`, `apps/web/app/components/Footer.tsx` (Shop column)
  - `apps/web/app/candy/CandyHome.tsx` (band after the marquee)
  - `apps/web/app/products/[handle]/page.tsx`, `apps/web/app/products/[handle]/PurchasePanel.tsx`
- Create: `apps/web/lib/promo/ticker.ts`, `apps/web/lib/promo/ticker.test.ts`

**Interfaces:**
- Consumes: Task 3 exports; `PromoStrip` (Task 4) for the homepage band.
- Produces:
  - `tickerItems(state: PromoState): string[]` — the seasonal items **first**, then the existing static items.
  - `PurchasePanel` gets a new prop `bundleOffer: boolean`.

- [ ] **Step 1: Failing tests** for `tickerItems`:
  - offerLive + cutoff `"standard"` + not BF → starts with `["ANY 3 SETS FOR $45", "US: ORDER BY MON DEC 14 FOR CHRISTMAS DELIVERY"]`.
  - BF window → first item `"BLACK FRIDAY: ANY 3 SETS FOR $45"`.
  - Season over → exactly the current static list:
    - `"100% HAND-PAINTED"`
    - `"FREE SHIPPING OVER $35"`
    - `"READY IN MINUTES"`
    - `"EASY CLEAN REMOVAL"`
    - `"PRESS ON. SHOW OFF."`
- [ ] **Step 2: Run** → FAIL. **Step 3:** Implement `tickerItems`, and make `AnnouncementTicker` render `tickerItems(getPromoState(new Date()))`. **Step 4:** Run → PASS.
- [ ] **Step 5: Nav + footer.**
  - While `seasonLive`, the Header and MobileMenu gift link reads "🎁 Gift Guide" → `/collections/holiday-gift-guide`; otherwise it stays as it is today.
  - The Footer Shop column adds "Holiday Gift Guide" while `seasonLive`.
- [ ] **Step 6: Homepage band.** Render `<PromoStrip />` directly after the flavor marquee in `CandyHome`.
- [ ] **Step 7: PDP.**
  - `page.tsx` passes `bundleOffer={isBundleEligible(product.tags) && getPromoState(new Date()).offerLive}`.
  - When `bundleOffer` is true, `PurchasePanel` shows:
    - an `OFFER_LABEL` chip beside the stock sticker
    - in place of the "Add one more set to unlock free shipping" nudge: **"Mix any 3 sets for $45 — add 2 more to your bag."**
  - Otherwise the current behaviour is unchanged.
  - `SimpleProductTemplate` (gift card, essentials) is untouched.
- [ ] **Step 8:** Vitest (all, `--maxWorkers=2`), tsc, eslint touched files → green.
- [ ] **Step 9: Commit** — `feat(web): seasonal ticker, gift guide nav, homepage band, PDP bundle chip`.

### Task 6: Cart savings, progress, suggestions

**Files:**
- Modify:
  - `packages/shopify/src/queries.ts` (`CART_FRAGMENT`): add `discountAllocations { discountedAmount { amount currencyCode } }` on the cart and on lines, and `product { tags }` on the merchandise.
  - `packages/shopify/src/types.ts`: `ShopifyCartLine.merchandise.product.tags: string[]`; `discountAllocations: { discountedAmount: ShopifyMoney }[]` on the line and on `ShopifyCart`.
  - `apps/web/app/cart/page.tsx`
- Create: `apps/web/lib/promo/cart.ts`, `apps/web/lib/promo/cart.test.ts`, `apps/web/app/cart/CartSuggestions.tsx`

**Interfaces:**
- Consumes: `isBundleEligible`, `BUNDLE_SIZE`, `getPromoState`; `PRODUCT_RECOMMENDATIONS_QUERY` (returns `tags`, `variants(first:1){id availableForSale}`); `addToCart` server action (form fields `variantId`, `quantity`).
- Produces:
  - `countEligibleSets(lines: ShopifyCartLine[]): number` — quantity-weighted.
  - `bundleSavings(cart: ShopifyCart): number` — sums cart and line allocations.
  - `bundleNudge(count: number): string | null`
  - `pickSuggestions(candidates: ShopifyProduct[], inCartHandles: Set<string>, limit: number): ShopifyProduct[]`

- [ ] **Step 1: Failing tests:**
  - `countEligibleSets`: one line Nail Set qty 3 → 3; gift card + glue + 2 sets → 2.
  - `bundleSavings`: allocations 3.00 cart + 2.50 + 2.50 lines → 8.00; none → 0.
  - `bundleNudge` (exact strings):
    - 0 → `null`
    - 1 → `"Add 2 more sets — get 3 for $45"`
    - 2 → `"Add 1 more set — get 3 for $45"`
    - 3 → `null`
    - 4 → `"Add 2 more sets for another 3-pack"`
    - 5 → `"Add 1 more set for another 3-pack"`
  - `pickSuggestions`: drops candidates already in the cart, non-`Nail Set` items and unavailable first variants; keeps input order; caps at `limit`.
- [ ] **Step 2: Run** → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Cart page (only while `offerLive`).**
  - In the summary aside, show the savings row **"3 for $45 — you saved $X.XX"** when `bundleSavings > 0`.
  - Show the `bundleNudge` text above the free-shipping box when non-null.
  - Render `<CartSuggestions />` below the lines.
- [ ] **Step 6: CartSuggestions.**
  - Async server component.
  - Fetch `PRODUCT_RECOMMENDATIONS_QUERY` for the first eligible line's product id; fall back to the `best-sellers` collection when that returns fewer than 3 items.
  - `pickSuggestions(..., 4)`, rendered as small cards, each with an `addToCart` form (quantity 1).
  - Append a Nail Glue card if `nail-glue` is not in the cart.
  - Heading: "Complete your 3-pack". Hidden when the result is empty.
- [ ] **Step 7:** Vitest, tsc, eslint touched files → green.
- [ ] **Step 8: Commit** — `feat(web): cart bundle savings, progress nudge and 3-pack suggestions`.

### Task 7: E2E, preview verification, ship

**Files:**
- Create: `apps/web/e2e/holiday.spec.ts`

**Interfaces:**
- Consumes: the whole feature. Imports `SEASON_END`, `OFFER_END` via relative path `../lib/promo/holiday`. Each test calls `test.skip(Date.now() >= <end>.getTime())` with the relevant end constant.

- [ ] **Step 1: Write the spec:**
  - Eligible PDP (`/products/midnight-circuit`) shows text "Any 3 sets for $45".
  - `/products/nailismo-gift-card` and `/products/nail-glue` don't.
  - Adding 3 eligible sets (3 PDP add-to-bag submissions) → `/cart` shows "you saved" and total `$45`.
  - `/collections/holiday-gift-guide` shows heading "Holiday Gift Guide" and text matching `/order by|deliver instantly/i`.
  - Header has a link named /Gift Guide/.
  - Home shows "ANY 3 SETS FOR $45".
- [ ] **Step 2:** Push the branch → wait for a Vercel preview `success` via GitHub deployment status. Run `holiday.spec.ts` + `trust-and-pdp.spec.ts` + `purchase-path.spec.ts` against the preview (`--workers=2`) → all pass.
- [ ] **Step 3: Screenshot rounds** (≥2, per FRONTDESIGN.md) on the preview: home, PDP, cart with 3 sets, gift guide — each at 1440 and 390. Fix and re-push until clean.
- [ ] **Step 4:** Open the PR to `main` with the `workflows/deploy_web.md` checklist. **Ask the owner before merging** (merge = production). After the merge: run the E2E suite against `https://nailismo.com` and confirm a live 3-set cart shows $45.
- [ ] **Step 5:** Diary note for the owner: cancel EPD after Dec 15 unless it's kept; the Shopify gift-guide description stays undated.
