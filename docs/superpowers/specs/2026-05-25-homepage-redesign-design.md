# Homepage Re-design — Design Spec

**Date:** 2026-05-25
**Scope:** `apps/web` homepage only. Re-skin + re-order to the `NAILISMO.md` brand brief.
**Status:** Approved for planning.

---

## 1. Goal

Re-design the Nailismo homepage to match `NAILISMO.md`: Korean men's-fashion editorial, calm and quietly confident. The current homepage reads as a streetwear magazine (warm paper, red `akane` accent, crosshair/tape/"N°/Edition" marks, "Wear Your Edge" / "Fearless FAQ" voice). The brief explicitly rejects that direction ("avoid harsh black-and-red dominance", "calm, not chaotic").

This pass redirects the **homepage** only. PDP, PLP, fit page, lookbook page, journal, and the mobile app are out of scope and will follow once this direction is locked.

## 2. Decisions (locked)

- **Scope:** Homepage first; roll out to other pages later.
- **Approach:** Hybrid — keep the strong section bones, re-theme tokens, strip red + decorative marks, re-order to the brief's flow, drop off-brief sections.
- **Direction:** "Quiet Editorial" (companion option A) — oversized thin condensed headline, generous whitespace, a single restrained lavender hairline accent, minimal labels. Not the "concept-store grid" variant.
- **Type:** Grotesk-only. Ekster (display) + Geograph (body/UI) + Akkurat Mono (labels). No serif on the homepage.
- **Flow:** 8 beats per brief. Keep a short FAQ near checkout. Drop the "styling essential" band and the standalone "Edits" teaser (fold both in).

## 3. Non-goals

- No PDP / PLP / fit / lookbook / journal / mobile work.
- No Shopify query or data-shape changes (reuse existing `lib/shopify` products).
- No new payment/checkout integration — reassurance section is presentational (wallet logos, copy); checkout still redirects to Shopify-hosted checkout.
- Components dropped from the homepage are **unmounted from `page.tsx`, not deleted** from the repo.

## 4. Design tokens — rewrite `apps/web/app/globals.css`

Replace the current palette block. Map:

| Current | New (Nippon) | Hex | Use |
|---|---|---|---|
| `--paper` | `--shironeri` | `#FCFAF2` | page background |
| *(new)* | `--gofun` | `#FFFFFB` | cards, modals, checkout/surface |
| `--shiracha` | `--shironezumi` | `#BDC0BA` | borders, dividers, disabled |
| `--tetsu` | `--kurotsurubami` | `#0B1013` | primary text, dark UI |
| `--rikyu` | `--ainezumi` | `#566C73` | nav, filters, labels, captions |
| `--akane` (red) | `--fujinezumi` | `#6E75A4` | hover, active controls, editorial links |
| *(new)* | `--haizakura` | `#D7C4BB` | warm editorial bands, UGC tags |
| *(new)* | `--kamenozoki` | `#A5DEE4` | sizing-tool highlights, subtle CTA moments |
| `--bengara`, `--kodou`, `--kikuchiba`, `--gin` | **removed** | — | unused after retheme |

**Color ratio target:** ~55% shironeri/gofun · 25% kurotsurubami · 10% shironezumi · 5% ainezumi · 5% accents (fujinezumi/haizakura/kamenozoki). Accents are styling details, never the main identity.

**Marks & CSS to change:**
- **Delete:** `.tape` / `.tape-navy` / `.tape-dark`, `.crosshair*`, `.corner-mark*`, `.edit-pill-active` (red), `.dot` (red separator) → recolor or remove.
- **Repoint:** `--font-serif` references → Ekster; `.spec strong` (was serif) → Ekster; `.edit-pill-active` accent red → fujinezumi; `.acc-tile.is-product` red border → fujinezumi.
- **Keep, quieted:** `.grain` opacity → ~0.06; `.ulink` underline; `.hairline`; layered `.shadow-editorial` (re-tint shadow rgba from `40,26,20` warm-brown → `11,16,19` neutral).
- **Focus ring:** `a/button/summary:focus-visible` outline `--akane` → `--fujinezumi`, keep offset.
- Buttons (`.btn-primary` etc.): swap `--tetsu`/`--paper` → `--kurotsurubami`/`--shironeri`. Keep transform/opacity-only transitions; keep hover + focus-visible + active states.

## 5. Typography — `apps/web/app/layout.tsx`

- Load Ekster (weights 200/300/400 from `brand_assets/Font/Ekster/`, self-hosted via `next/font/local`), Geograph (300/400/500), Akkurat Mono. Confirm/extend existing `next/font` setup; copy needed font files into `apps/web/public/fonts/` if not already present.
- Remove Noto Serif and SelfModern from the homepage font wiring.
- `--font-sans` = Geograph, display headings = Ekster (via `.font-display`/`--font-serif` slot repointed), `--font-mono` = Akkurat Mono.
- Sentence case default; uppercase reserved for small mono labels (`.eyebrow`/`.cap`). Moderate type scale — no oversized-to-loud headings.

## 6. Homepage flow — `apps/web/app/page.tsx`

Eight beats. Each existing component is re-themed; some merge. Order:

| # | Section | Copy / content | Source component(s) | Fate |
|---|---|---|---|---|
| ticker | Quiet shipping/returns line (no red, mono, ainezumi) | "Free shipping over $X · clean removal · S–XL fit" | `AnnouncementTicker` | re-theme |
| 01 | **Editorial hero** | Full-bleed male-hand image (rings/knit), "Press-On Nails for Men" headline, sub "Clean sets. Fast wear. Built for everyday styling.", CTAs **Shop Sets** (primary) + **Find My Size** (ghost). Single fujinezumi hairline. | `Hero` | re-theme to A-direction |
| 02 | **New arrivals** | Fresh sets grid; absorbs curated-edit framing (collection names like "Seoul Matte Edit" allowed as labels, not a separate section) | `MostWanted` + `Edits` | merge + re-theme |
| 03 | **Best for first-time users** | Starter-friendly framing + one featured set with includes/specs | `StarterGateway` + `Featured` | merge + re-theme |
| 04 | **Fit & sizing guide** | Size chart (mm), wear modes, clean removal; absorbs the 5-min application steps | `Fit` + `Application` | merge + re-theme |
| 05 | **Lookbook / styled-with** | Outfit-context product storytelling | `Lookbook` | keep + re-theme |
| 06 | **Creator styling clips** | Short vertical video strip (lazy-loaded, static image fallback) | from `SocialProof` | re-theme |
| 07 | **Reviews** | Real men's-hand photos, first-time-user reviews | from `SocialProof` | re-theme |
| 08 | **Checkout & shipping reassurance** | Wallet logos (Apple/Google/Shop Pay, PayPal, Venmo, Cash App, Klarna/Afterpay/Affirm), concrete delivery copy, **short FAQ (3–4 first-timer Qs)**, newsletter/early-access signup | `FinalCta` + `Faq` + `Newsletter` | merge + re-theme |
| — | Header + Footer | Nav: New · Sets · Best Sellers · Fit · Lookbook · About (ainezumi) | `Header` / `Footer` | re-theme |

**Unmounted from `page.tsx` (kept in repo):** `CulturalAnchor` (its watch/ring/scent positioning collapses into hero subcopy), `Bundle` (kit configurator → PDP/cart concern), `TasteEducation` (shape/finish education → folded into Fit). The voice shifts from "Wear Your Edge / Fearless FAQ / Edition 01" to calm, wearable copy ("Clean sets", "Made for men's hands", "Salon finish in minutes, clean removal").

Section 06+07 require splitting `SocialProof` into two re-themed sections (creator clips vs reviews). If the existing component already separates these visually, split into two components; otherwise keep one component rendering two clearly-bounded sub-sections.

## 7. Product card

Used by sections 02 and 03. Per brief:
- `--gofun` surface, `--shironezumi` hairline border — not boxed-in or heavy.
- Large image (gradient overlay + subtle treatment per FRONTDESIGN guardrails), set name, **shape** (Short Square / Almond / Oval), **finish** (Matte / Chrome / Sheer / Gloss), price, small finish swatches, **quiet** quick-add control.
- Restrained labels only: New / Low stock / Editor pick / Restocked. No loud discount badges.
- Hover animates `transform`/`opacity` only (image scale already in `.edit-card`/`.look-card`).
- Map from existing `ShopifyProduct` fields; shape/finish derive from product options/tags (reuse what `MostWanted`/`Featured` already read — no new query fields).

## 8. Accessibility & performance

- WCAG 2.2 AA contrast. Verify `ainezumi #566C73` on `shironeri #FCFAF2` for small text (~4.5:1 needed) — if it fails, use `ainezumi` only for ≥18px/bold or darken to `kurotsurubami` for body-size labels.
- Visible `:focus-visible` rings on every interactive element (fujinezumi). Keyboard-reachable nav.
- Descriptive alt text on all hero/product/styling images.
- Video (section 06): lazy-loaded, `transform`/`opacity` animation only, static image fallback for each clip.
- Targets: LCP ≤ 2.0s mobile, CLS ≤ 0.05; `next/image` with explicit width/height; images in `.avif` per repo standard.

## 9. Verification

- `pnpm --filter web build` and lint pass.
- `pnpm --filter web dev` (or `node serve.mjs` per repo) → **report the local URL to the user for manual screenshot review** (per user preference: no automated screenshot loop).
- Visual check against `NAILISMO.md`: no red, no crosshair/tape/numbering marks, palette ratio holds, grotesk-only type, 8-beat order, calm voice.
- Existing tests (`lib/fit/sizing.test.ts`) still pass; no Shopify contract change.

## 10. Risks / open items

- `ainezumi` small-text contrast (see §8) — resolve during build.
- `SocialProof` split (§6) — confirm cleanest boundary when in the component.
- Real editorial hero imagery (male hand) — placeholder/`brand_assets` or existing `website_images` until real shots exist; do not ship raw merchant uploads, route through `next/image`.
- Font licensing for self-hosting Ekster/Geograph assumed OK (already in `brand_assets/`).
