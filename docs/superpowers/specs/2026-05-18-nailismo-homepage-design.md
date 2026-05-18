# Nailismo Homepage — Design Spec

**Date:** 2026-05-18
**Status:** Approved

## Goal

Build a single-page, high-craft static homepage for **Nailismo.com**, a men's
press-on nails online store. Visual showcase only — no backend, no real
commerce. Inspired by allbirds.com: light, airy, minimal, product-photo led,
with deep-red accents and bold typography for "edge."

## Build & Tech

- Single `index.html` at the project root (`/Users/stuartxu/webs/nailismo/index.html`).
- Tailwind CSS via CDN (`https://cdn.tailwindcss.com`); custom tokens configured
  inline via `tailwind.config`.
- Ekster font loaded locally via `@font-face` from
  `brand_assets/Font/Ekster/*.woff2`.
- Body font: Inter via Google Fonts.
- Real assets referenced by relative path. Folders with spaces
  (`Listing 2025.7.30/`, `website images/`) must be URL-encoded (`%20`) in
  `src`/`url()`.
- Served with `node serve.mjs` → `http://localhost:3000`.
- Mobile-first responsive.
- Reviewed against `FRONTDESIGN.md` anti-generic guardrails; screenshot-reviewed
  for at least 2 comparison rounds.

## Color Palette — all sourced from nipponcolors.com

| Role | Nippon color | Hex |
|---|---|---|
| Page background | 練色 Neri-iro | `#FCFAF2` |
| Card / surface white | 胡粉色 Gofun-iro | `#FFFFFB` |
| Text / headings | 鉄黒 Tetsukuro | `#281A14` |
| Accent (CTAs, links, announcement bar) | 茜色 Akane-iro | `#B7282E` |
| Borders / section bands | 利休白茶 Rikyū-shiracha | `#DDD3C0` |
| Muted text | 白鼠 Shironezumi | `#BDC0BA` |

No default Tailwind palette colors used. Shadows are layered and warm-tinted at
low opacity.

## Typography

- **Headings:** Ekster — Black / Extrabold weights for display, tight tracking
  (`-0.03em`) on large headings.
- **Body:** Inter — line-height `1.7`, regular weight.
- Two distinct families per the workflow rule (no shared font for headings and
  body).

## Brand Assets

- Logo: `brand_assets/Logo/01.png` (black wordmark "NAILISMO / WEAR YOUR EDGE").
  `02.png` is blank — do not use.
- Hero image: `website images/banner picture 1.jpg` (teal background, hands with
  green/brown nails, open copy space on the left).
- Product images: chosen from `Listing 2025.7.30/` — clean white-background flat
  lays. Use the non-`1`-suffixed file of each pair as the primary card image.
- Additional band/tile images from `website images/`.

## Page Sections (top → bottom)

1. **Announcement bar** — slim Akane-red strip, centered text, e.g. "Free
   shipping on orders over $50".
2. **Header** — logo left; nav (Shop · Collections · Our Story · Sizing); cart
   icon right. Sticky; transparent over hero, solid off-white on scroll. Mobile:
   hamburger menu.
3. **Hero** — full-bleed `banner picture 1.jpg`. Left-aligned copy in the open
   space: headline "Wear Your Edge", supporting line, "Shop Press-Ons" CTA
   button (Akane-red).
4. **Value props** — 4-item row, icon + label: Salon-grade finish · 5-minute
   application · Reusable · Designed for men.
5. **New Drops** — section heading + grid of 6–8 real products from
   `Listing 2025.7.30/` on white cards. Each card: product image, name, price,
   hover lift (transform/opacity only).
6. **Brand story band** — beige (`Rikyū-shiracha`) full-width band; image paired
   with copy "Redefining masculine fashion" and an "Our Story" text link.
7. **Shop by vibe** — 3 large image tiles with overlay labels: Bold & Graphic /
   Minimal / Seasonal. Gradient overlay + `mix-blend-multiply` color treatment.
8. **How it works** — 3 numbered steps: Measure → Apply → Wear.
9. **Testimonials** — 3 short customer quotes with name/role.
10. **Newsletter** — email capture input + button (visual only, no submission).
11. **Footer** — link columns, logo, social icons, payment-method row,
    copyright.

## Interaction & Craft Details

- Every clickable element has hover, focus-visible, and active states.
- Animate only `transform` and `opacity`; spring-style easing; no
  `transition-all`.
- Surface layering: page base → elevated cards → sticky/floating header.
- Product/tile images get a gradient overlay and color treatment layer.

## Out of Scope

- Working cart, checkout, or product detail pages.
- Real product data, pricing logic, search.
- Backend, form submission, analytics.
- The Next.js / headless Shopify stack described in `CLAUDE.md` — this spec
  intentionally follows `workflow/FRONTDESIGN.md` (static single-file) instead.
  Cart icon and newsletter are presentational only.

## Success Criteria

- Renders correctly at `localhost:3000` on mobile and desktop widths.
- Uses real local logo, font, and product/banner images — no placeholders where
  assets exist.
- All colors trace to the nipponcolors.com palette above.
- Passes the `FRONTDESIGN.md` anti-generic guardrails.
