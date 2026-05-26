# Candy Inner-Routes Full Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every non-home route in the full playful Candy Pop language (rounded cards, sticker badges, pill buttons, bounce, lilac/lime/slate/plum palette) so the whole site matches the homepage — not just colors, but shapes and motion.

**Architecture:** The candy design system (`app/candy/candy.css`, scoped under `.candy`) becomes site-wide by moving the `CandyShell` wrapper (fonts + `.candy` scope + css import) into the root layout. Every route then renders inside `.candy` and can use the `candy-*` primitives. The homepage stops double-wrapping. Shared chrome (Header/Footer/MobileMenu/AnnouncementTicker/Newsletter) is redesigned once and benefits every page; then each route body is rebuilt. The recolored Nippon tokens already in `globals.css` remain as a compatibility layer so any un-migrated markup still reads candy-correct.

**Tech Stack:** Next.js 16 App Router (RSC), TypeScript, Tailwind v4, scoped `candy.css`, Ekster (display) + Nunito (body), Shopify Storefront API (existing `lib/shopify`).

**Verification model (visual work):** Each task verifies by (a) `npx next build` clean, and (b) USER screenshots the route at `http://localhost:3000/<route>` and confirms (no auto-screenshot). Commit after each task. No unit tests added unless logic changes.

---

## File Structure

- `app/candy/candy.css` — design system; **extend** with route-level primitives (page header band, breadcrumb, accordion, form fields, table/line-item, empty states, pagination, prose).
- `app/candy/CandyShell.tsx` — already wraps fonts + `.candy`; reused by root layout.
- `app/layout.tsx` — **modify**: wrap `children` in `CandyShell` (globalize candy). Keep existing local fonts.
- `app/page.tsx` — **modify**: drop its own `CandyShell` wrapper (now provided by root).
- `app/components/{Header,MobileMenu,Footer,AnnouncementTicker,Newsletter}.tsx` — **rebuild** candy.
- `app/<route>/page.tsx` — **rebuild** body per route, using candy primitives.

Routes to redesign (by phase): shop, product/[handle], collections/[handle], cart, search · fit, about, contact, faq · journal, journal/[handle], lookbook, lookbook/[handle], policies/[handle], account, thank-you, not-found.

---

## Phase A — Foundation (do first; unblocks everything)

### Task A1: Globalize the candy design system

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Wrap root layout children in CandyShell**
  In `app/layout.tsx`, import `CandyShell` from `./candy/CandyShell` and wrap `{children}` with `<CandyShell>{children}</CandyShell>` inside `<body>`. Keep `bg-paper text-tetsu` on body (harmless under the candy wrapper).

- [ ] **Step 2: De-duplicate the homepage wrapper**
  In `app/page.tsx`, remove the `CandyShell` wrapper (root now provides it); render `<CandyHome />` directly. Keep its `metadata` + `revalidate`.

- [ ] **Step 3: Build**
  Run: `npx next build` — Expected: clean compile, 65 routes.

- [ ] **Step 4: User check**
  Confirm `/` still correct (no double background/scroll) and any inner route (e.g. `/shop`) now sits on lilac with Nunito/Ekster + candy classes available.

- [ ] **Step 5: Commit** — `feat(web): globalize candy design system to all routes`

### Task A2: Extend candy.css with route primitives

**Files:** Modify: `app/candy/candy.css`

- [ ] **Step 1: Add primitives** (one cohesive block, scoped under `.candy`):
  - `.candy-pagehead` — rounded lilac/cream band for page titles + breadcrumb
  - `.candy-crumb` — pill breadcrumb links
  - `.candy-field` / `.candy-label` — rounded form inputs/selects/textarea (reuse `.candy-input` styling), error state
  - `.candy-accordion` — rounded bordered `<details>` with bounce chevron (FAQ/policies)
  - `.candy-line` — cart line-item row (rounded, bordered, candy shadow)
  - `.candy-chip` — filter/sort pills (active = lime fill, plum text)
  - `.candy-prose` — article/policy body type scale (Ekster headings, Nunito body, lime links)
  - `.candy-empty` — playful empty state (big emoji + message + CTA)
  - `.candy-pager` — rounded pagination buttons
- [ ] **Step 2: Build** — `npx next build` clean.
- [ ] **Step 3: Commit** — `feat(web): add candy route primitives to design system`

### Task A3: Redesign shared chrome — Header + MobileMenu

**Files:** Modify: `app/components/Header.tsx`, `app/components/MobileMenu.tsx`

- [ ] **Step 1:** Rebuild Header in candy style: sticky translucent lilac bar (`candy-head`), `candy-logo` wordmark, pill nav links (`candy-nav`), lime Cart pill (`candy-btn is-soda`-style), rounded mobile hamburger. Preserve existing nav targets + cart count props/data.
- [ ] **Step 2:** Rebuild MobileMenu as a rounded candy drawer: lilac sheet, big bouncy pill links, lime CTA, plum text. Preserve open/close logic and links.
- [ ] **Step 3: Build** — clean.
- [ ] **Step 4: User check** — header/menu on `/shop` + mobile width.
- [ ] **Step 5: Commit** — `feat(web): candy-style header and mobile menu`

### Task A4: Redesign shared chrome — Footer + AnnouncementTicker + Newsletter

**Files:** Modify: `app/components/Footer.tsx`, `app/components/AnnouncementTicker.tsx`, `app/components/Newsletter.tsx`

- [ ] **Step 1:** Footer → plum (`--ink`) panel, lime section headings, lilac links, payment chips (match homepage footer).
- [ ] **Step 2:** AnnouncementTicker → plum marquee bar with lime text (match homepage).
- [ ] **Step 3:** Newsletter → "Join the candy club" rounded card, `candy-input` + lime `candy-btn`. Preserve submit action.
- [ ] **Step 4: Build** clean. **User check.** **Commit** — `feat(web): candy-style footer, ticker, newsletter`

---

## Phase B — Shopping routes

### Task B1: Shop (PLP) — `app/shop/page.tsx`
- [ ] Rebuild as candy product grid using the homepage `FlavorCard` pattern (rounded tile, sticker, swatches, lime quick-add). Filters/sort → `candy-chip` pills. Page title via `candy-pagehead`. Empty state via `candy-empty`. Preserve Shopify data fetch + filter logic. Build clean → user check `/shop` → commit `feat(web): candy redesign shop PLP`.

### Task B2: Product (PDP) — `app/product/[handle]/page.tsx`
- [ ] Rebuild PDP: rounded gallery, plum title + lime price chip, swatches, **lime sticky Add-to-Bag bar** (mobile), candy info sections (application time / wear / removal / what's included) as rounded cards + `candy-accordion`. Keep structured-data + variant/cart logic. Build → user check → commit `feat(web): candy redesign product page`.

### Task B3: Collections — `app/collections/[handle]/page.tsx`
- [ ] Candy header band + FlavorCard grid (reuse PLP pattern). Preserve collection fetch. Build → check → commit `feat(web): candy redesign collections`.

### Task B4: Cart — `app/cart/page.tsx`
- [ ] Rebuild: `candy-line` line items (rounded, swatch, qty steppers as candy buttons), summary card, **lime checkout `candy-btn`**, `candy-empty` for empty cart. Preserve cart mutations + checkout redirect. Build → check → commit `feat(web): candy redesign cart`.

### Task B5: Search — `app/search/page.tsx`
- [ ] Candy search field (`candy-input`), FlavorCard results grid, `candy-empty` no-results. Preserve query logic. Build → check → commit `feat(web): candy redesign search`.

---

## Phase C — Content & utility routes

### Task C1: Fit — `app/fit/page.tsx`
- [ ] Rebuild sizing flow as a friendly candy stepper (rounded cards, lime CTA, `candy-field`). Preserve sizing logic (`lib/fit/sizing`). Build → check → commit `feat(web): candy redesign fit guide`.

### Task C2: About + Contact — `app/about/page.tsx`, `app/contact/page.tsx`
- [ ] About → candy editorial (rounded image cards, `candy-prose`, sticker accents). Contact → `candy-field` form + rounded info cards; preserve form action. Build → check → commit `feat(web): candy redesign about + contact`.

### Task C3: FAQ — `app/faq/page.tsx` (+ `components/Faq.tsx` if shared)
- [ ] `candy-accordion` Q&A, candy page header. Build → check → commit `feat(web): candy redesign faq`.

### Task C4: Journal list + article — `app/journal/page.tsx`, `app/journal/[handle]/page.tsx`
- [ ] List → rounded article cards (image, title, excerpt, sticker date). Article → `candy-prose` body, rounded hero image, candy meta. Preserve article fetch + structured data. Build → check → commit `feat(web): candy redesign journal`.

### Task C5: Lookbook list + entry — `app/lookbook/page.tsx`, `app/lookbook/[handle]/page.tsx`
- [ ] Rounded lookbook cards/grid + candy entry layout. Preserve data. Build → check → commit `feat(web): candy redesign lookbook`.

### Task C6: Policies — `app/policies/[handle]/page.tsx`
- [ ] Candy page header + sidebar pill nav (`candy-crumb`/`candy-chip`) + `candy-prose` body. Preserve policy fetch. Build → check → commit `feat(web): candy redesign policies`.

### Task C7: Account + Thank-you + Not-found — `app/account/page.tsx`, `app/thank-you/page.tsx`, `app/not-found.tsx`
- [ ] Account → rounded candy cards/buttons. Thank-you → celebratory candy confirmation (big sticker, lime CTA). Not-found → playful candy 404 (`candy-empty`). Preserve any logic. Build → check → commit `feat(web): candy redesign account, thank-you, 404`.

---

## Phase D — Cleanup

### Task D1: Prune dead Nippon-era CSS + verify
- [ ] Remove any candy-obsolete classes in `globals.css` no longer referenced (only ones proven unused via grep). Keep recolored tokens (still used as compat layer). Full `npx next build`. User does a final pass across all routes. Commit `chore(web): prune dead styles post-candy-redesign`.

---

## Self-Review notes
- **Coverage:** all 16 non-home route files + 5 shared components + design-system extension are tasked. Home covered by A1.
- **Shared-first ordering:** A3/A4 chrome lands candy on every page before per-route bodies, so partial progress always looks intentional.
- **Data safety:** every shopping/data task explicitly says "preserve fetch/cart/variant logic" — redesign is markup/classes only.
- **No new dependencies.** Reuses existing fonts, Shopify client, candy.css.
