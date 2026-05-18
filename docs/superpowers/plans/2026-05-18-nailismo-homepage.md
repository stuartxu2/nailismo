# Nailismo Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file, high-craft static homepage for Nailismo.com, a men's press-on nails store.

**Architecture:** One `index.html` at the project root, Tailwind via CDN with inline custom-token config, Ekster font loaded locally via `@font-face`, real local images referenced by URL-encoded relative paths. A `serve.mjs` static server and `screenshot.mjs` Puppeteer script support the screenshot-review loop from `workflow/FRONTDESIGN.md`.

**Tech Stack:** HTML, Tailwind CSS (CDN), Inter (Google Fonts), Ekster (local woff2), Node.js (`http` module + Puppeteer for tooling).

**Reference spec:** `docs/superpowers/specs/2026-05-18-nailismo-homepage-design.md`

**Note on testing:** This is a static visual page — there is no unit-test framework. The verification method for every build task is the screenshot-review loop: serve locally, screenshot, read the PNG, compare against the spec, fix mismatches. Treat the screenshot as the test.

---

### Task 1: Tooling — static server and screenshot script

`workflow/FRONTDESIGN.md` references `serve.mjs` and `screenshot.mjs` at the project root, but neither file exists. Create them.

**Files:**
- Create: `serve.mjs`
- Create: `screenshot.mjs`

- [ ] **Step 1: Create `serve.mjs`**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = 3000;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}`));
```

- [ ] **Step 2: Create `screenshot.mjs`**

```js
import puppeteer from '/Users/stuartxu/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { mkdir, readdir } from 'node:fs/promises';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';
const dir = './temporary screenshots';
await mkdir(dir, { recursive: true });
const existing = await readdir(dir);
const n = existing.filter(f => f.startsWith('screenshot-')).length + 1;

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${dir}/screenshot-${n}${label}.png`, fullPage: true });
await browser.close();
console.log(`Saved ${dir}/screenshot-${n}${label}.png`);
```

- [ ] **Step 3: Verify the server runs**

Run: `node serve.mjs` (in background), then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: server logs the serving message; curl prints `404` (no `index.html` yet — confirms server is up).

- [ ] **Step 4: Commit**

```bash
git add serve.mjs screenshot.mjs
git commit -m "Add static server and screenshot tooling"
```

---

### Task 2: index.html scaffold — head, fonts, tokens, layout shell

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html` with the document head and Tailwind config**

Build the `<head>`:
- `<title>Nailismo — Wear Your Edge</title>`, meta charset, viewport.
- Tailwind CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
- Google Fonts: Inter (weights 400, 500, 600).
- `@font-face` block for Ekster, loading from `brand_assets/Font/Ekster/`. Define
  family `Ekster` with `Ekster_Regular.woff2` (400), `Ekster_Bold.woff2` (700),
  `Ekster_Extrabold.woff2` (800), `Ekster_Black.woff2` (900). Use
  `font-display: swap`.
- Inline `tailwind.config` script defining the custom palette and fonts:

```html
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        neri:    '#FCFAF2',  // page background (練色)
        gofun:   '#FFFFFB',  // card / surface white (胡粉色)
        tetsu:   '#281A14',  // text / headings (鉄黒)
        akane:   '#B7282E',  // accent (茜色)
        shiracha:'#DDD3C0',  // borders / bands (利休白茶)
        nezumi:  '#BDC0BA',  // muted text (白鼠)
      },
      fontFamily: {
        display: ['Ekster', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      letterSpacing: { tightest: '-0.03em' },
    },
  },
};
</script>
```

- [ ] **Step 2: Add the `<body>` shell**

`<body class="bg-neri text-tetsu font-body antialiased">` with empty placeholder
comments for each section in order: announcement bar, header, hero, value props,
new drops, brand story, shop by vibe, how it works, testimonials, newsletter,
footer. This locks section order for later tasks.

- [ ] **Step 3: Screenshot-verify**

Run: `node serve.mjs` (background, skip if already running), then
`node screenshot.mjs http://localhost:3000 scaffold`.
Read the PNG from `temporary screenshots/`. Expected: blank off-white
(`#FCFAF2`) page, no console errors, fonts loaded.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Scaffold homepage: head, fonts, color tokens, section shell"
```

---

### Task 3: Announcement bar and header

**Files:**
- Modify: `index.html` (announcement bar + header placeholders)

- [ ] **Step 1: Build the announcement bar**

Slim full-width strip, `bg-akane text-gofun`, centered text at ~12px uppercase
with wide tracking: "Free shipping on orders over $50 · 30-day returns".

- [ ] **Step 2: Build the header**

Sticky header (`sticky top-0 z-50`). Transparent over the hero, transitioning to
`bg-neri/95 backdrop-blur` with a `border-shiracha` bottom border on scroll
(small inline scroll listener toggling a class).
- Left: logo `<img src="brand_assets/Logo/01.png" alt="Nailismo">`, height ~36px.
- Center/right: nav links — Shop, Collections, Our Story, Sizing — font-body,
  medium weight, `hover:text-akane` with an animated underline (transform/opacity
  only).
- Far right: cart icon (inline SVG outline) with a small Akane count badge.
- Mobile (`<md`): collapse nav to a hamburger button that toggles a full-width
  dropdown panel.

- [ ] **Step 3: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 header`. Read the PNG. Confirm:
red announcement bar, logo crisp, nav aligned right, hover states present.
Check mobile by adding a 390px-width pass if needed.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add announcement bar and sticky header"
```

---

### Task 4: Hero section

**Files:**
- Modify: `index.html` (hero placeholder)

- [ ] **Step 1: Build the hero**

Full-bleed section, min-height ~85vh. Background image
`website%20images/banner%20picture%201.jpg` (`bg-cover bg-center`) — teal frame
with hands; copy space is on the LEFT, so place content left-aligned.
- Eyebrow: "Press-On Nails for Men" — small, uppercase, tracked, `text-akane`.
- Headline: "Wear Your Edge" — `font-display` weight 900, large clamp size
  (~`clamp(2.75rem, 6vw, 5rem)`), `tracking-tightest`, `text-tetsu`.
- Sub-line: one sentence, e.g. "Salon-grade sets that go on in five minutes and
  come off when you say so."
- CTA: "Shop Press-Ons" button — `bg-akane text-gofun`, generous padding,
  rounded, layered warm-tinted shadow, hover lift via `transform`.
- On mobile, add a subtle off-white scrim behind the text for legibility.

- [ ] **Step 2: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 hero`. Read the PNG. Confirm the
banner image loads (URL-encoded path works), text sits in the open left space
and is readable, CTA styled correctly.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add hero section"
```

---

### Task 5: Value props row

**Files:**
- Modify: `index.html` (value props placeholder)

- [ ] **Step 1: Build the value props row**

Full-width band on `bg-neri`, generous vertical padding. 4 equal columns
(2×2 on mobile), each a thin-stroke inline SVG icon above a short label:
1. "Salon-grade finish"
2. "5-minute application"
3. "Reusable, set after set"
4. "Designed for men"
Thin vertical `border-shiracha` dividers between columns on desktop.

- [ ] **Step 2: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 valueprops`. Read the PNG.
Confirm 4-up desktop / 2-up mobile, icons aligned, even spacing.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add value props row"
```

---

### Task 6: New Drops product grid

**Files:**
- Modify: `index.html` (new drops placeholder)

- [ ] **Step 1: Build the New Drops grid**

Section with heading "New Drops" (`font-display`, weight 800,
`tracking-tightest`) and a short sub-line. Grid of 8 product cards — 4 columns
desktop, 2 columns mobile, gap ~24px. Use these exact products (all in
`Listing 2025.7.30/`, path URL-encoded as `Listing%202025.7.30/...`):

| Image file | Product name | Price |
|---|---|---|
| `black and white press on nails.jpg` | Monochrome | $24 |
| `cool red press on nails.jpg` | Crimson Edge | $26 |
| `silver press on nails.jpg` | Sterling | $24 |
| `amber and gold press on nails.jpg` | Amber Gold | $28 |
| `cat eye black press on nails.jpg` | Black Cat Eye | $26 |
| `ocean blue press on nails.jpg` | Ocean Blue | $24 |
| `dazzling gold press on nails.jpg` | 24K Dazzle | $28 |
| `green leopard press on nails.jpg` | Wild Card | $26 |

Each card: `bg-gofun`, rounded, square-ish image area (`object-cover`), product
name (`font-body` medium), price (`text-akane`). Hover: lift via `transform`
and a layered warm shadow; "Add to bag" or "+" affordance appears on hover
(opacity transition). Card is a non-functional `<a href="#">` (static demo).

- [ ] **Step 2: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 newdrops`. Read the PNG. Confirm
all 8 product images load (no broken images — verifies the spaced/dotted folder
path is correctly encoded), grid aligns, hover affordance styled.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add New Drops product grid"
```

---

### Task 7: Brand story band

**Files:**
- Modify: `index.html` (brand story placeholder)

- [ ] **Step 1: Build the brand story band**

Full-width band on `bg-shiracha`. Two-column layout (stacks on mobile):
- One side: image `website%20images/banner%20picture%206.jpg`, rounded, with a
  gradient overlay and a `mix-blend-multiply` color treatment layer.
- Other side: heading "Redefining masculine fashion" (`font-display`, weight
  800, `tracking-tightest`), 2–3 sentences of brand copy about Nailismo making
  press-ons for Gen Z, LGBTQ+ communities, and modern professionals, and an
  "Our Story" text link with an animated arrow (transform on hover).

- [ ] **Step 2: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 story`. Read the PNG. Confirm
image loads, two-column balance, beige band distinct from page background.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add brand story band"
```

---

### Task 8: Shop by vibe tiles

**Files:**
- Modify: `index.html` (shop by vibe placeholder)

- [ ] **Step 1: Build the Shop by vibe tiles**

Section heading "Shop by vibe". 3 large image tiles (3 columns desktop, stacked
mobile), each a tall image with a `bg-gradient-to-t from-black/60` overlay, a
`mix-blend-multiply` color layer, and an overlaid label + "Explore" link in
`text-gofun`. Hover: image scales slightly via `transform`.

| Tile label | Image |
|---|---|
| Bold & Graphic | `website%20images/banner%20picture%205.jpg` |
| Minimal | `website%20images/banner%20picture%203.jpg` |
| Seasonal | `website%20images/banner%20picture%208a.jpg` |

- [ ] **Step 2: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 vibe`. Read the PNG. Confirm 3
tiles load, overlay labels legible, hover scale works. If any image is missing
or poorly cropped, substitute another `banner picture*` file from
`website images/` and note the change.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add Shop by vibe tiles"
```

---

### Task 9: How it works

**Files:**
- Modify: `index.html` (how it works placeholder)

- [ ] **Step 1: Build the How it works section**

Section heading "Three steps to a fresh set" on `bg-neri`. 3 numbered steps
(3 columns desktop, stacked mobile), each: a large `font-display` numeral
(01/02/03) in `text-shiracha`, a step title, and one line of copy:
1. "Measure" — "Match your nail width with our sizing guide."
2. "Apply" — "Buff, glue or tab, press for thirty seconds."
3. "Wear" — "Two weeks of edge. Pop them off, reuse the set."

- [ ] **Step 2: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 howto`. Read the PNG. Confirm
3-step layout, large numerals, alignment.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add How it works section"
```

---

### Task 10: Testimonials

**Files:**
- Modify: `index.html` (testimonials placeholder)

- [ ] **Step 1: Build the testimonials section**

Section heading e.g. "Worn by men with edge". 3 quote cards (3 columns desktop,
stacked mobile) on `bg-gofun`, rounded, layered warm shadow. Each: a short quote,
an attribution name, and a short role/descriptor. Write 3 plausible quotes —
example: "First set that didn't feel like a costume. — Marcus T., DJ". A small
Akane-colored quotation mark or rule accents each card.

- [ ] **Step 2: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 testimonials`. Read the PNG.
Confirm 3 cards, even heights, readable.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add testimonials section"
```

---

### Task 11: Newsletter and footer

**Files:**
- Modify: `index.html` (newsletter + footer placeholders)

- [ ] **Step 1: Build the newsletter band**

Full-width band on `bg-tetsu` with `text-gofun`. Heading e.g. "Get first access
to drops", one supporting line, and an inline email input + "Sign up" button
(`bg-akane`). Visual only — `onsubmit="return false"` on the form; no backend.

- [ ] **Step 2: Build the footer**

Footer on `bg-tetsu text-gofun` (or `bg-neri` with top `border-shiracha` —
choose for contrast against the newsletter band; if newsletter is dark, make the
footer dark too and merge them visually). Contents:
- Logo (`brand_assets/Logo/01.png` — use a light/inverted treatment if on dark,
  e.g. `invert` filter, since the logo is black).
- 3 link columns: Shop (New Drops, Collections, Sizing Guide), Company (Our
  Story, Contact, Stockists), Help (Shipping, Returns, FAQ).
- Social icons row (inline SVGs: Instagram, TikTok, X).
- Payment-method icons row.
- Bottom line: "© 2026 Nailismo. Wear your edge."

- [ ] **Step 3: Screenshot-verify**

Run: `node screenshot.mjs http://localhost:3000 footer`. Read the PNG. Confirm
newsletter band, footer columns aligned, logo visible against the background.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add newsletter band and footer"
```

---

### Task 12: Responsive pass and full-page review rounds

**Files:**
- Modify: `index.html` (fixes only)

- [ ] **Step 1: Desktop full-page review**

Run: `node screenshot.mjs http://localhost:3000 full-desktop`. Read the PNG.
Walk every section against the spec — colors trace to the nipponcolors palette,
Ekster on headings / Inter on body, spacing consistent, no default Tailwind
blue/indigo anywhere, no `transition-all`. List concrete mismatches
("heading is 40px, should be ~64px"). Fix them in `index.html`.

- [ ] **Step 2: Mobile full-page review**

Temporarily set the viewport in `screenshot.mjs` to `{ width: 390, height: 844 }`
(or add a width arg), run `node screenshot.mjs http://localhost:3000 full-mobile`,
read the PNG. Confirm: hamburger menu works, grids collapse correctly, hero copy
readable, no horizontal overflow. Fix issues, then restore the viewport to 1440.

- [ ] **Step 3: Second comparison round**

Re-screenshot desktop and mobile after fixes (`node screenshot.mjs ... full-desktop-2`
/ `full-mobile-2`), read the PNGs, confirm no visible issues remain. Per
`FRONTDESIGN.md`, do at least 2 comparison rounds; continue until no visible
defects remain.

- [ ] **Step 4: Verify interactive states**

In a quick check, confirm every clickable element (nav links, CTA, product
cards, footer links, newsletter button) has hover, focus-visible, and active
states defined. Add any that are missing.

- [ ] **Step 5: Commit**

```bash
git add index.html screenshot.mjs
git commit -m "Responsive pass and screenshot-review fixes"
```

---

### Task 13: Final verification and cleanup

**Files:**
- Modify: `.gitignore` (create if absent)

- [ ] **Step 1: Confirm no broken assets**

With the server running, load `http://localhost:3000` and verify in the final
full-page screenshot that every image (logo, hero banner, 8 products, story
image, 3 vibe tiles) renders — no broken-image icons. This confirms all
URL-encoded paths resolve.

- [ ] **Step 2: Ignore disposable output**

Add `temporary screenshots/` and `.tmp/` to `.gitignore` (create the file if it
does not exist) so review screenshots are not committed.

- [ ] **Step 3: Final commit**

```bash
git add .gitignore
git commit -m "Ignore screenshot output directory"
```

---

## Self-Review Notes

- **Spec coverage:** All 11 sections map to Tasks 3–11. Palette/typography/assets
  → Task 2. Build/serve tooling → Task 1 (spec assumed `serve.mjs` existed; it
  did not, so a task was added). Responsive + anti-generic guardrails + 2
  screenshot rounds → Task 12. Out-of-scope items (cart, newsletter) kept
  presentational only.
- **Placeholders:** None — every section has exact assets, copy direction, and
  classes.
- **Consistency:** Color tokens (`neri`, `gofun`, `tetsu`, `akane`, `shiracha`,
  `nezumi`) and font tokens (`display`, `body`) defined once in Task 2 and reused
  verbatim throughout.
