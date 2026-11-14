# Holiday Package (Black Friday → Christmas) — Design Spec

**Date:** 2026-11-14
**Status:** Approved 2026-11-14 (owner decision 2026-11-14: offer goes live as soon as configured, not Nov 27)
**Scope:** "Any 3 sets for $45" offer, holiday gift guide, shipping-cutoff messaging, cart savings + suggestions. Web (`apps/web`) + Shopify config. Black Friday is Fri Nov 27 2026; Christmas is Fri Dec 25.

## Intent

Catch Black Friday and holiday-gifting demand, and lift order value. Today a single set ($17.99) sits under the $35 free-shipping line and the site runs no promotion at all — the only nudge is "add one more set for free shipping". A clear multi-set offer, a gift path, and honest "order by" dates give BFCM shoppers and gift buyers a reason to buy more, now.

Success: the offer prices correctly everywhere a shopper sees a price (cart, checkout, order); gift buyers find a gift guide in one click from anywhere; nobody orders for Christmas past a date we can still deliver by.

## Goals

1. **Offer** — any 3 eligible nail sets for **$45 total**, mix-and-match, applied automatically (no code). Live **as soon as it is configured (target: 2026-11-14/15) → Dec 15 23:59 PT**. The owner approved an early start; no Nov 27 start, no test windows.
2. **Gift guide** — one Shopify collection page of giftable sets + gift card, linked sitewide during the season.
3. **Shipping-cutoff messaging** — date-aware, matching the shipping policy.
4. **Cart** — shows bundle progress, the savings once applied, and suggestions that help complete a 3-pack.

## Non-goals

- No sitewide % sale and no other new discounts.
- No iOS app UI changes (the discount still applies there automatically, since it is server-side).
- No "build your box" page or bundle-builder UI.
- No CMS / metaobject-driven promo content — dates and copy live in code (they are known now).
- No redesign of existing pages; additions only.

## Anti-goals (failure even if it "works")

- **Price mismatch** — the site shows one price and checkout another.
- **Fake urgency** — resetting countdowns, invented stock levels, "guaranteed delivery" claims. Cutoff copy says "order by … for Christmas delivery", based on the published policy.
- **Gift card or glue counted toward the bundle**, or the offer copy showing on products it doesn't apply to.
- Promo copy still live after the offer ends.

## Constraints

- **Shopify Basic plan.** Custom apps containing Shopify Functions require Plus, so a fixed-price mix-and-match discount needs a public App Store app.
- **Headless.** The site's cart is the Storefront API cart. The discount must show up in `cart.cost` / `discountAllocations`, not only at checkout. App theme widgets don't apply.
- **Timezones.** Store timezone is `America/Los_Angeles`. The shipping policy's daily cutoff is **2pm ET** (orders before ship same day, Mon–Fri).
- **Shipping policy.** Standard takes 3–7 business days, $10 flat, free over $35. Express takes 1–2 business days, $14. Ships from LA. Christmas math, delivering by Thu Dec 24:
  - Standard: order by Tue Dec 15, 2pm ET.
  - Express: order by Tue Dec 22, 2pm ET.
  - The banner uses one day of buffer: **Standard by Mon Dec 14, Express by Mon Dec 21**.
- **Catalog data.** `productType` is empty on every product, so eligibility must come from a tag. Gift card variants are $10/$25/$50; Shopify never discounts gift cards. Exclusions (as in `tools/shopify_new_drops_refresh.py`): gift card, `nail-glue`, `glue-remover`, `custom-nail-set`.
- **Prices (verified 2026-11-14).** Every ACTIVE nail set is $17.99 or $24.99, including santa slay; the $12.99 tier in `tools/shopify_repricing.py` is stale. So every eligible 3-pack saves money: from $8.97 (3 × $17.99) up to $29.97 (3 × $24.99).
- **Shipping policy source of truth.** The live Shopify policy, synced onto `/policies/shipping`, says Standard is 3–7 business days. The "3–5" text in `app/policies/[handle]/page.tsx` is a stale fallback and is not authoritative.
- **Currency.** The site queries without `@inContext`, so every price shown is USD; the "$45" copy is consistent across the site. Christmas cutoff copy applies to US shipping only.
- **No local `next dev`/`next build`** on the dev machine (it freezes). Verify on Vercel preview deployments.
- Shopify writes (tags, collections, discount config) are production mutations. This design's approval covers the ones listed here.

## Approaches (offer mechanism)

| | Approach | Trade-off | Outcome |
|---|---|---|---|
| A | Native automatic discount "Buy 3+, get 20% off" | No app, but not a fixed price | Owner declined; wants "$45" |
| **B** | **Every Possible Discount (EPD)** — public app, Shopify Functions "Buy X for $Y" with collection qualifier, triggers on cart contents; $19/mo, 7-day trial | Works with existing Add to Bag everywhere. Small vendor (5.0, 36 reviews); headless not explicitly documented | **Chosen by owner, 2026-11-14** |
| C | Appstle Bundles — Function-backed fixed bundle; every cart line must carry `_appstle-bb-id` / `_appstle_bundles_type`; eligible items are a product list | Documented headless; but needs a dedicated 3-pack builder flow, and sets added from PDPs don't count | Fallback if B fails the cart test |
| D | QD Quantity Breaks | Theme-based; reviews report discounts dropping at checkout | Rejected |

## Design

### 1. Offer — "Any 3 sets for $45"

- **Eligibility:** tag `Nail Set` on every ACTIVE nail set (same exclusions as above), and only sets priced above $15. That guard means a 3-pack always saves money, even if a cheap seasonal tier comes back. *(Builder's call.)* A hidden smart collection `nail-sets` uses rule `TAG = "Nail Set"`. Hide it from storefront collection lists, like the color collections.
  - Tagging is done by an idempotent tool, dry-run by default.
  - `workflows/sync_new_products.md` gains a step so future sets get the tag.
- **EPD rule:** "Buy 3 for $45" from collection `nail-sets`. Automatic. Starts immediately, ends Dec 15 23:59 PT. The owner installs EPD and enters the rule in its admin UI (app UIs aren't reachable from here); the builder supplies the exact settings.
- **Repeats:** per group of 3, so 6 sets = $90 and 4 sets = $45 + one at full price.
- **Combining:**
  - Combines with shipping discounts, so free shipping still applies ($45 ≥ $35).
  - Does **not** combine with other product/order discounts. Shoppers get the better of the two.
- **Mixed prices:** where EPD lets us choose which items form the bundle, prefer the higher-priced sets (most generous to the shopper). If EPD doesn't offer the choice, document its behaviour.
- **Verification gate — before any site UI work:**
  1. Right after the owner configures the live rule:
  2. Create a Storefront API cart with 3 eligible sets. Confirm `cart.cost.totalAmount` = $45 (+ tax) and the lines carry `discountAllocations`.
  3. Also check 2 sets (no discount), 3 sets including a $24.99 one, and gift card + 2 sets (no discount).
  4. If the cart doesn't reflect it before checkout, **stop and go back to the owner** with the options: Appstle with a 3-pack builder page, or the native "Buy 3+, 20% off". No fallback branch is pre-built. *(Builder's call.)*
- **Cost:** after the offer ends, remind the owner to cancel EPD ($19/mo) unless it's kept for future promos.

### 2. Promo config + site messaging

- **Config module:** one module (e.g. `lib/promo/holiday.ts`) holds the offer window, cutoff instants and copy. It exposes pure, unit-tested functions that answer "what's active at time T".
- **Timeline (builder's call):**
  - **From deploy → Dec 15 23:59 PT:** the offer is live, so the chip, bundle progress and cart savings show. Gift guide links, the homepage band and the US "order by Dec 14" line are also live. No teaser phase. **Offer UI (chip, progress, savings, "3 for $45" copy) deploys only after the verification gate passes on the live discount,** so shoppers never see an offer the cart doesn't honour. Gift guide and cutoff messaging can ship independently.
  - **Nov 27 → Nov 30 (Black Friday–Cyber Monday):** the same offer, optionally labelled "Black Friday" in the ticker. No price change. *(Builder's call.)*
  - **Cutoff switches (2pm ET):**
    - Dec 14: the line becomes "Express: order by Dec 21".
    - Dec 21: it becomes "Gift cards deliver instantly".
  - **Dec 26 00:00 PT:** all seasonal copy and links revert.
- Cutoff lines are labelled US.
- **Announcement ticker:** during the offer, show "ANY 3 SETS FOR $45" and the current "ORDER BY … FOR CHRISTMAS" line. Static items stay. After Dec 25, back to normal.
- **Homepage:** a slim promo band near the top linking to the gift guide and the offer. It's an addition; don't touch the hero carousel.
- **PDP (eligible sets only, during the offer):**
  - an "Any 3 sets for $45" chip near the price
  - the existing free-shipping nudge becomes bundle progress ("Add 2 more sets → 3 for $45")
- **Freshness:** messages must switch within ~1 hour of each boundary. Some pages are statically cached, so either revalidate or decide client-side. That's the builder's call; a page must not show expired promo copy for a day.

### 3. Gift guide

- **Collection:** a manual Shopify collection `holiday-gift-guide` titled "Holiday Gift Guide". It renders with the existing `/collections/[handle]` page.
- **Proposed members** (owner can edit in admin):
  - holiday: snow szn, santa slay, first frost, sweater weather
  - crowd favorites: the Best Sellers sets
  - Gift Card
  - Nail Glue as a stocking stuffer
- **Description (Shopify):** an evergreen, short gender-neutral gift intro: sets for anyone, and the gift card if unsure of size. About 120–200 words, with **no dates**.
- **Dated lines:** the offer and cutoff lines on that page are rendered from the promo config in code, so they expire on their own. *(Builder's call.)*
- **Links during the season:** header nav (the existing "🎁 Gift Card" item becomes "🎁 Gift Guide"), homepage band, ticker, footer Shop column. They revert Dec 26 00:00 PT.
- **After the season:** the collection stays published as an evergreen gift page (sitemap, SEO); only the sitewide links come down. *(Builder's call.)*

### 4. Cart

- Extend the cart query (`CART_FRAGMENT`) with line- and cart-level `discountAllocations`, plus product tags on line merchandise, to count eligible sets.
- **Summary:** show the "3 for $45" savings row when applied ("You saved $X"). Show bundle progress when 1–2 eligible sets are in the cart (or 4–5: "add 2 more for another 3-pack" — builder's call).
- **Suggestions:** a "Complete your 3-pack" row of 3–4 eligible sets not already in the cart.
  - Source: Shopify product recommendations for a cart item, falling back to Best Sellers.
  - Add-to-cart uses the existing server action.
  - Add Nail Glue as one suggestion if it isn't in the cart.
- The existing free-shipping progress stays.

## Testing / verification

- Unit (Vitest):
  - promo date logic at every boundary (PT/ET, DST-safe)
  - eligibility counting from cart lines
  - suggestion filtering
- Tool (pytest): tagging selection is idempotent.
- Storefront API cart verification (Design §1 gate) — scripted, re-runnable.
- E2E on a Vercel preview:
  - chip on an eligible PDP and not on the gift card
  - a 3-set cart shows the savings row and a $45 total (needs the discount active — see gate)
  - gift guide page renders with its products
  - banner copy covered by unit tests rather than clock-faking in E2E
- Screenshot rounds (desktop + mobile: home, PDP, cart, gift guide) per `FRONTDESIGN.md`.
- Deploy via `workflows/deploy_web.md`. Ship the offer UI as soon as the gate passes, and the rest by Thu Nov 26 at the latest.

## Left to the builder

Component structure, file names, exact copy wording (within the voice: playful, gender-neutral, no fake urgency), tool naming, the caching approach for date switching, and how the verification script is packaged.
