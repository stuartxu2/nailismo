# Homepage Re-design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin and re-order the `apps/web` homepage to the `NAILISMO.md` Korean men's-fashion editorial brief — Nippon palette (no red, no streetwear marks), grotesk-only type, calm 8-beat flow.

**Architecture:** Hybrid re-theme. The palette is applied globally by **remapping hex values under the existing Tailwind token names** in `globals.css` (so all components inherit it with zero color edits and out-of-scope pages improve for free). Homepage work is then: remove decorative mark markup, calm the copy, wire the Ekster display font, rebuild the hero, and re-order `page.tsx` to the 8-beat flow. Off-brief sections are unmounted from `page.tsx` (kept in the repo). "Merges" in the spec are presentational grouping via render order, not file consolidation, for this tentative pass.

**Tech Stack:** Next.js 16 (App Router, RSC), Tailwind CSS v4 (`@theme inline`), `next/font/local`, TypeScript, Vitest.

**Verification reality:** Most tasks are visual. They verify by `pnpm --filter web build` + `pnpm --filter web lint` succeeding and by manual screenshot review — **the user runs screenshots; do not run an automated screenshot loop** (user preference). The only unit suite is `apps/web/lib/fit/sizing.test.ts`; it must stay green. No fabricated CSS unit tests.

**Spec:** `docs/superpowers/specs/2026-05-25-homepage-redesign-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/web/app/globals.css` | Design tokens, palette, marks, fonts, component CSS | Rewrite token block + mark/font CSS |
| `apps/web/app/layout.tsx` | Font loading, `<body>` classes | Add Ekster, drop Noto Serif |
| `apps/web/public/fonts/Ekster/` | Self-hosted Ekster woff2 | Create (copy from `brand_assets`) |
| `apps/web/app/page.tsx` | Homepage section order | Re-order + unmount off-brief |
| `apps/web/app/components/Hero.tsx` | Beat 01 hero | Rebuild to A-direction |
| `apps/web/app/components/AnnouncementTicker.tsx` | Quiet top ticker | Re-theme copy |
| `apps/web/app/components/{MostWanted,StarterGateway,Featured,Fit,Application,Lookbook,SocialProof,FinalCta,Faq,Newsletter,Header,Footer}.tsx` | Beats 02–08 + chrome | Mark removal + copy calm sweep |
| (product card markup, located in Task 8) | Product card per brief | Re-theme |

**Unmounted from `page.tsx` (not deleted):** `CulturalAnchor.tsx`, `Edits.tsx`, `Bundle.tsx`, `TasteEducation.tsx`.

---

## Task 1: Palette, marks & font tokens — `globals.css`

**Files:**
- Modify: `apps/web/app/globals.css` (token `:root`, `@theme inline`, mark/font rules)

The strategy: keep token **names** (`--paper`, `--tetsu`, `--akane`, …) so no component class needs editing; change only their **values** to the Nippon palette. Remapping `--akane` from red to lavender removes red site-wide automatically. Add Nippon-named aliases for new code.

- [ ] **Step 1: Replace the `:root` block (lines 3–23)**

```css
:root {
  --font-sans:  var(--font-geograph), system-ui, sans-serif;
  --font-serif: var(--font-ekster), var(--font-geograph), sans-serif; /* repointed: no serif on homepage */
  --font-mono:  var(--font-akkurat-mono), ui-monospace, monospace;
  --font-ekster: var(--font-ekster-local);

  /* Nippon palette (values remapped; names kept for zero-churn) */
  --paper:      #FCFAF2; /* SHIRONERI — page bg */
  --toriko:     #FFFFFB; /* GOFUN — clean surface */
  --shiracha:   #BDC0BA; /* SHIRONEZUMI — borders/dividers */
  --tetsu:      #0B1013; /* KUROTSURUBAMI — text/dark UI */
  --sumi:       #0B1013;
  --rikyu:      #566C73; /* AINEZUMI — nav/labels/captions */
  --gin:        #8C9296; /* muted neutral */
  --hair:       rgba(11,16,19,0.14);
  --hair-strong:rgba(11,16,19,0.28);
  --hair-dark:  rgba(252,250,242,0.18);
  --akane:      #6E75A4; /* FUJINEZUMI — accent (was red) */
  --bengara:    #566C73;
  --konnezumi:  #6E75A4;
  --kodou:      #566C73;
  --kikuchiba:  #D7C4BB; /* HAIZAKURA — warm accent */

  /* Nippon-named aliases for new homepage code */
  --shironeri:      #FCFAF2;
  --gofun:          #FFFFFB;
  --shironezumi:    #BDC0BA;
  --kurotsurubami:  #0B1013;
  --ainezumi:       #566C73;
  --fujinezumi:     #6E75A4;
  --haizakura:      #D7C4BB;
  --kamenozoki:     #A5DEE4;
}
```

- [ ] **Step 2: Extend `@theme inline` (after line 37, before the font lines) with alias colors**

```css
  --color-shironeri: var(--shironeri);
  --color-gofun: var(--gofun);
  --color-shironezumi: var(--shironezumi);
  --color-kurotsurubami: var(--kurotsurubami);
  --color-ainezumi: var(--ainezumi);
  --color-fujinezumi: var(--fujinezumi);
  --color-haizakura: var(--haizakura);
  --color-kamenozoki: var(--kamenozoki);
```

- [ ] **Step 3: Repoint display/serif fonts (lines 52–53)**

```css
.font-display { font-family: var(--font-ekster); }
.font-serif { font-family: var(--font-ekster); }
```

- [ ] **Step 4: Quiet the grain and neutralize shadow tint**

In `.grain::after` (line 65) change `opacity: 0.10;` → `opacity: 0.06;`.
In `.shadow-editorial` (lines 152–156) replace both `rgba(40,26,20,…)` with neutral:

```css
.shadow-editorial {
  box-shadow:
    0 40px 80px -30px rgba(11,16,19,0.18),
    0 12px 24px -12px rgba(11,16,19,0.12);
}
```

- [ ] **Step 5: Soften retained mark classes (used by out-of-scope pages)**

`.crosshair::before, .crosshair::after` (line 173): `background: rgba(40,26,20,0.45);` → `background: rgba(11,16,19,0.28);`
`.corner-mark` (line 184): `color: rgba(40,26,20,0.45);` → `color: var(--ainezumi);`
(`.tape`, `.dot`, `.edit-pill-active` already shift to lavender via the `--akane` remap — no edit needed.)

- [ ] **Step 6: Verify build**

Run: `pnpm --filter web build`
Expected: build succeeds. No TypeScript/CSS errors. (`--font-ekster-local` is wired in Task 2; until then it falls back to Geograph — acceptable.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(web): remap palette to Nippon tokens, drop red, quiet marks"
```

---

## Task 2: Wire the Ekster display font — `layout.tsx`

**Files:**
- Create: `apps/web/public/fonts/Ekster/` (woff2 files)
- Modify: `apps/web/app/layout.tsx:3` (import), `:27-33` (drop Noto Serif), `:6-17` (add Ekster), `:59` (html class)

- [ ] **Step 1: Copy Ekster fonts into public**

```bash
mkdir -p apps/web/public/fonts/Ekster
cp brand_assets/Font/Ekster/Ekster_Thin.woff2 brand_assets/Font/Ekster/Ekster_Light.woff2 brand_assets/Font/Ekster/Ekster_Regular.woff2 apps/web/public/fonts/Ekster/
```

- [ ] **Step 2: Add the Ekster `localFont` and remove Noto Serif in `layout.tsx`**

Delete the `Noto_Serif` import (line 3) and the `notoSerif` block (lines 27–33). Add after the `akkuratMono` block (after line 25):

```tsx
const ekster = localFont({
  variable: "--font-ekster-local",
  display: "swap",
  src: [
    { path: "../public/fonts/Ekster/Ekster_Thin.woff2", weight: "200", style: "normal" },
    { path: "../public/fonts/Ekster/Ekster_Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/Ekster/Ekster_Regular.woff2", weight: "400", style: "normal" },
  ],
});
```

- [ ] **Step 3: Update the `<html>` className (line 59)**

```tsx
className={`${geograph.variable} ${akkuratMono.variable} ${ekster.variable}`}
```

(Leave `<body className="bg-paper text-tetsu">` as-is — the tokens now resolve to shironeri/kurotsurubami.)

- [ ] **Step 4: Verify build**

Run: `pnpm --filter web build`
Expected: succeeds; no reference to `Noto_Serif` or `--font-noto-serif` remains. Run `grep -rn "noto" apps/web/app` → expect no matches.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/public/fonts/Ekster
git commit -m "feat(web): load Ekster display font, drop Noto Serif"
```

---

## Task 3: Re-order homepage to the 8-beat flow — `page.tsx`

**Files:**
- Modify: `apps/web/app/page.tsx:1-110`

- [ ] **Step 1: Remove off-brief imports**

Delete the import lines for `StarterGateway` is **kept**; delete imports for `CulturalAnchor` (line 5), `Edits` (line 6), `Bundle` (line 12), `TasteEducation` (line 13). Also delete the `EDIT_HANDLES` constant (lines 27–41) and the `editGroups`/`editKeys` block (lines 82–86), and the `type EditGroup, type EditKey` from the `StarterGateway`/`Edits` import.

- [ ] **Step 2: Replace the returned JSX (lines 88–109) with the 8-beat order**

```tsx
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <Hero />
      {/* 02 — New arrivals */}
      <MostWanted products={mostWanted} />
      {/* 03 — Best for first-time users */}
      <StarterGateway products={starterProducts} />
      <Featured />
      {/* 04 — Fit & sizing */}
      <Fit />
      <Application />
      {/* 05 — Lookbook */}
      <Lookbook />
      {/* 06 + 07 — Creator clips & reviews */}
      <SocialProof />
      {/* 08 — Checkout & shipping reassurance */}
      <FinalCta />
      <Faq />
      <Newsletter />
      <Footer />
    </>
  );
```

- [ ] **Step 3: Verify build + no dead imports**

Run: `pnpm --filter web build`
Expected: succeeds. Run `pnpm --filter web lint` → expect no "unused import" / "unused var" errors (confirms `CulturalAnchor`, `Edits`, `Bundle`, `TasteEducation`, `EDIT_HANDLES`, `editGroups` fully removed).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(web): reorder homepage to NAILISMO 8-beat flow, unmount off-brief sections"
```

---

## Task 4: Rebuild the hero (beat 01, A-direction) — `Hero.tsx`

**Files:**
- Modify: `apps/web/app/components/Hero.tsx:1-88` (full replace)

A-direction: oversized thin Ekster headline, generous whitespace, single fujinezumi hairline, no corner-marks/tape/crosshair, calm copy + brief CTAs. Reuses the existing hero image paths.

- [ ] **Step 1: Replace the file contents**

```tsx
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="nail-container relative z-10 pt-20 md:pt-24 pb-20 md:pb-28 grid grid-cols-12 gap-6 md:gap-12 items-end min-h-[84vh]">
        <div className="col-span-12 lg:col-span-6 relative">
          <span className="cap rise">Press-on · for men</span>
          <h1 className="font-display font-light tracking-tightest leading-[0.92] text-[clamp(48px,8vw,120px)] mt-6 rise delay-1">
            <span className="block">Press-On</span>
            <span className="block">Nails for Men</span>
          </h1>
          <p className="max-w-[440px] mt-8 text-[16px] md:text-[17px] text-rikyu leading-relaxed rise delay-2">
            Clean sets. Fast wear. Built for everyday styling — alongside the rings, the knit, the watch.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 rise delay-3">
            <a href="#new-arrivals" className="btn-primary">
              Shop Sets <span className="arrow">→</span>
            </a>
            <a href="#fit" className="btn-ghost">
              Find My Size <span className="arrow">→</span>
            </a>
          </div>
          <div className="mt-14 h-px w-10 bg-akane rise delay-4" />
        </div>

        <div className="col-span-12 lg:col-span-6 relative h-[58vh] md:h-[74vh] rise delay-2">
          <figure className="absolute inset-0 overflow-hidden shadow-editorial">
            <img
              src="/images/website/hero-monochrome-minimal.avif"
              alt="Man's hand wearing clean press-on nails with a ring and knitwear"
              className="img-cover"
              loading="eager"
            />
          </figure>
        </div>
      </div>

      <div className="border-t border-hair">
        <div className="nail-container py-4 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
          <span>S–XL fit · Applies in minutes · Removes cleanly</span>
          <span className="hidden md:inline">Scroll <span className="ml-2 inline-block translate-y-[1px]">↓</span></span>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build + visual**

Run: `pnpm --filter web build`
Expected: succeeds. Manual: hero shows thin Ekster headline "Press-On Nails for Men", lavender hairline, no corner-marks/tape/crosshair, CTAs "Shop Sets" + "Find My Size".

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/components/Hero.tsx
git commit -m "feat(web): rebuild hero to quiet editorial A-direction"
```

---

## Task 5: Quiet the announcement ticker — `AnnouncementTicker.tsx`

**Files:**
- Modify: `apps/web/app/components/AnnouncementTicker.tsx:3-10` (items), `:26` (separator)

- [ ] **Step 1: Replace the `items` array (lines 3–10) with calm reassurance copy**

```tsx
const items: TickerItem[] = [
  { label: "Free shipping over $60", href: "/policies/shipping" },
  { label: "S–XL fit per set", href: "/#fit" },
  { label: "Applies in minutes", href: "/#fit" },
  { label: "Clean removal", href: "/#fit" },
  { label: "Made for men's hands", href: "/about" },
];
```

- [ ] **Step 2: Soften the separator (line 26)**

Replace `<span className="dot" />` with `<span className="mx-8 text-shironezumi">·</span>` (removes the lavender dot; uses a quiet mid-dot).

- [ ] **Step 3: Verify build**

Run: `pnpm --filter web build`
Expected: succeeds. Manual: ticker reads calm, no loud "New: The Architectural Edit" hype, no colored dot.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/AnnouncementTicker.tsx
git commit -m "feat(web): quiet announcement ticker copy and separators"
```

---

## Task 6: Mark-removal & copy-calm sweep — remaining homepage components

**Files (each modified):** `MostWanted.tsx`, `StarterGateway.tsx`, `Featured.tsx`, `Fit.tsx`, `Application.tsx`, `Lookbook.tsx`, `SocialProof.tsx`, `FinalCta.tsx`, `Faq.tsx`, `Newsletter.tsx` in `apps/web/app/components/`.

These render correctly with the new palette already (Task 1). This task removes the streetwear marks and editorial-magazine voice the brief rejects. Apply the **same mechanical rules to each file** — read the file first, then transform:

**Rule A — remove magazine numbering.** Delete every `corner-mark` element (e.g. `<div className="corner-mark …">…</div>`) and every `N°NN` / `Edition 01` / `SS / AW · 26` caption string. The numbered eyebrows (`cap">N°02`, `N°03`…`N°14`) become a plain section label or are removed: replace `N°NN` + the second `cap` ("Cultural Anchor", "Most Wanted Sets", etc.) with a single calm label.

**Rule B — remove `tape` and `crosshair` markup.** Delete any `<span className="tape…">…</span>` and any `<span className="crosshair…" />` elements (not the CSS — only the JSX usages in these files).

**Rule C — calm the voice.** Replace these exact literals where they appear:
- `Wear · Your · Edge` → remove (it lived in the hero, already gone)
- `Fearless FAQ` → `Common questions` (in `Faq.tsx`)
- `Final CTA` / `End · N°14 · Nailismo / Edition 01 · 26` / `Edition 01 · 26` → remove the numbering; CTA heading → `Start your first set` (in `FinalCta.tsx`)
- `Most Wanted Sets` → `New arrivals` (in `MostWanted.tsx`); add `id="new-arrivals"` to its top-level `<section>` (hero "Shop Sets" links here)
- `Ranked by sell-through · refreshed weekly` → `Fresh sets, restocked weekly` (in `MostWanted.tsx`)
- `Social Proof` → `Worn by` ; `Tag #nailismo · #wearyouredge` → `Tag #nailismo` (in `SocialProof.tsx`)
- `Taste Education`, `Cultural Anchor`, `Bundle` labels — these components are unmounted; no edit needed.

**Rule D — `text-akane` accents.** Leave `text-akane` class usages as-is (they now render lavender, on-brand). Do **not** mass-delete them.

**Rule E — section anchors.** Ensure `Fit.tsx` top `<section>` has `id="fit"` (hero "Find My Size" links here). If absent, add it.

- [ ] **Step 1: `MostWanted.tsx`** — apply Rules A, B, C (heading→"New arrivals", `id="new-arrivals"`, sell-through line), D, E. Verify: `pnpm --filter web build` succeeds.

- [ ] **Step 2: `StarterGateway.tsx`** — apply Rules A, B, C (drop `N°02`/"Product Gateway" numbering → label "Best for first sets"), D. Verify build.

- [ ] **Step 3: `Featured.tsx`** — apply Rules A, B, C (drop `N°05`/"Featured Product" numbering → keep "Best for first sets"). Verify build.

- [ ] **Step 4: `Fit.tsx`** — apply Rules A, B, C (drop `N°06`/"Fit System" numbering → "Fit & sizing"), E (`id="fit"`). Verify build.

- [ ] **Step 5: `Application.tsx`** — apply Rules A, B, C (drop `N°07`/"Application" numbering → "Application"). Verify build.

- [ ] **Step 6: `Lookbook.tsx`** — apply Rules A, B, C (drop `N°09`/"Lookbook" numbering → "Lookbook"; `Same outfit. Finished read.` → `Styled with the everyday`). Verify build.

- [ ] **Step 7: `SocialProof.tsx`** — apply Rules A, B, C (`Social Proof`→`Worn by`, hashtags). Verify build.

- [ ] **Step 8: `FinalCta.tsx`** — apply Rules A, B, C (remove all `Edition 01`/`N°14`/`End` numbering; heading→`Start your first set`; ensure its primary CTA reads `Add to Bag` or `Shop Sets`, links to `#new-arrivals`). Verify build.

- [ ] **Step 9: `Faq.tsx`** — apply Rules A, B, C (`Fearless FAQ`→`Common questions`; drop `N°13`). Verify build.

- [ ] **Step 10: `Newsletter.tsx`** — apply Rules A, B (copy `Free guide · No spam` is fine; ensure tone calm, mention early access). Verify build.

- [ ] **Step 11: Verify the sweep**

Run: `grep -rn "Edition 01\|N°\|Fearless\|Wear · Your · Edge\|crosshair\|className=\"tape" apps/web/app/components/{MostWanted,StarterGateway,Featured,Fit,Application,Lookbook,SocialProof,FinalCta,Faq,Newsletter}.tsx`
Expected: no matches (all numbering/marks/hype removed from homepage components).
Run: `pnpm --filter web build && pnpm --filter web lint`
Expected: both succeed.

- [ ] **Step 12: Commit**

```bash
git add apps/web/app/components
git commit -m "feat(web): strip streetwear marks and calm copy across homepage sections"
```

---

## Task 7: Header nav + Footer — `Header.tsx`, `Footer.tsx`

**Files:**
- Modify: `apps/web/app/components/Header.tsx`, `apps/web/app/components/Footer.tsx`

- [ ] **Step 1: Set the header nav labels**

Read `Header.tsx`. Ensure the primary nav reads exactly: **New · Sets · Best Sellers · Fit · Lookbook · About** (brief §Navigation). Map hrefs to existing routes (`/shop`, `/collections/...`, `/#fit`, `/lookbook`, `/about`). Remove any `tape`/`corner-mark`/`N°` marks (Rules A, B from Task 6). Nav link color uses `text-rikyu` (ainezumi) with `hover:text-akane` (fujinezumi) — leave or set accordingly.

- [ ] **Step 2: Footer sweep**

Read `Footer.tsx`. Apply Rules A, B, C (remove numbering/marks; calm any hype copy). Keep structure.

- [ ] **Step 3: Verify**

Run: `pnpm --filter web build && pnpm --filter web lint`
Expected: succeed. Manual: nav shows the six brief labels; no marks.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/Header.tsx apps/web/app/components/Footer.tsx
git commit -m "feat(web): set brief nav labels, calm header/footer"
```

---

## Task 8: Product card — brief spec

**Files:**
- Modify: the product-card markup (locate first; likely inline in `MostWanted.tsx` and/or `StarterGateway.tsx`/`Featured.tsx`, or a shared component).

- [ ] **Step 1: Locate the card markup**

Run: `grep -rln "addToCart\|quick\|formatPrice\|price\|swatch" apps/web/app/components`
Identify where a single product renders (image + name + price). If it is duplicated inline across `MostWanted`/`StarterGateway`/`Featured`, note it but do **not** extract a shared component this pass (surgical scope) — edit in place.

- [ ] **Step 2: Apply the brief card spec**

In the card markup, ensure each card shows, on a `bg-toriko` (gofun) surface with a `border-hair` (shironezumi) hairline — not a heavy box:
- Large product image (existing `next/image` or `<img>` with the `img-cover` treatment; keep gradient overlay if present).
- Set name.
- **Shape** label (e.g. Short Square / Almond / Oval) and **Finish** label (Matte / Chrome / Sheer / Gloss) — derive from existing `ShopifyProduct` option/tag fields the component already reads; if not available, render a static placeholder label rather than adding a new query field.
- Price.
- Small finish swatches (reuse any existing swatch markup; small squares).
- A **quiet** quick-add control (text/underline or small ghost button — not a loud filled bar).
- Restrained status label only when applicable: New / Low stock / Editor pick / Restocked. Remove any loud discount/percentage badge markup.

Hover animates `transform`/`opacity` only (existing `.edit-card`/`.look-card` already comply).

- [ ] **Step 3: Verify**

Run: `pnpm --filter web build`
Expected: succeeds. Manual: cards read minimal/image-led with shape+finish+price+swatches+quiet quick-add; no loud badges.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components
git commit -m "feat(web): re-theme product card to NAILISMO spec"
```

---

## Task 9: Accessibility contrast + final verification

**Files:**
- Possibly modify: `apps/web/app/globals.css` (only if contrast fails)

- [ ] **Step 1: Check ainezumi-on-shironeri contrast**

`--rikyu`/`--ainezumi` `#566C73` on `--paper`/`--shironeri` `#FCFAF2` ≈ contrast ratio 4.7:1 — passes AA for normal text (≥4.5:1). Confirm with any contrast checker. If a smaller/lighter usage fails, darken that specific text to `--tetsu` (kurotsurubami) rather than changing the token. No change needed if it passes.

- [ ] **Step 2: Confirm focus rings and keyboard nav**

Manual: Tab through hero CTAs, nav, quick-add. Each shows a visible fujinezumi `:focus-visible` ring (from `globals.css` Task 1). 

- [ ] **Step 3: Full build, lint, test**

Run: `pnpm --filter web build && pnpm --filter web lint && pnpm --filter web test`
Expected: all succeed; `sizing.test.ts` passes.

- [ ] **Step 4: Hand off for visual review**

Run: `pnpm --filter web dev` (or `node serve.mjs` from repo root per FRONTDESIGN).
**Report the local URL to the user for manual screenshot review.** Do not run an automated screenshot loop (user preference). Wait for user feedback; iterate on reported mismatches.

- [ ] **Step 5: Commit any contrast fix**

```bash
git add apps/web/app/globals.css
git commit -m "fix(web): ensure AA contrast on ainezumi labels"
```
(Skip if no change was needed.)

---

## Self-Review notes

- **Spec coverage:** tokens §4 → T1; type §5 → T2; flow/order §6 → T3–T7; product card §7 → T8; a11y §8 → T9; verification §9 → T9. Deviation: spec's "merges" become render-order grouping (stated in this plan's Architecture), and Tailwind tokens are value-remapped rather than renamed (lower blast radius) — both intentional, documented.
- **Out-of-scope confirmed untouched:** PDP/PLP/fit-page/lookbook-page/journal files are not edited; they inherit the palette only.
- **Anchors:** hero links `#new-arrivals` (set in T6.1) and `#fit` (T6.4) — both anchor IDs are created in the same plan.
