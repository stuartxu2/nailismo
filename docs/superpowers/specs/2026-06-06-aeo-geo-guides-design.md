# Phase 3A — AEO/GEO Editorial Guides — Design Spec

**Date:** 2026-06-06
**Status:** Draft for review
**Parent:** Full-site SEO/AEO/GEO plan, Phase 3 (`~/.claude/plans/do-a-full-site-auit-swirling-chipmunk.md`)

## Goal

Nailismo's catalog is strong but its editorial surface is thin (<600 words/page, no
buying/how-to/comparison content). Answer/generative engines cite *authoritative,
answer-shaped* pages — currently there is little to cite. Ship four evergreen guides that
directly answer the highest-demand press-on questions, structured for machine extraction,
and cross-linked into a topical cluster around the catalog.

## Content home & routing

- Publish into the existing Shopify blog **`journal`** (renamed from "News",
  `gid://shopify/Blog/81033429041`), currently empty.
- Rendered by the existing route `apps/web/app/journal/[handle]/page.tsx` → live at
  `/journal/{handle}`; the index `/journal` lists them. BlogPosting JSON-LD already emitted
  (Phase 1). No new routes.
- Editorial content stays in Shopify per CLAUDE.md ("editorial surface = Shopify").

## The four guides

Each ~800–1500 words, brand voice (fun, unisex, Gen-Z candy, genuinely informative).
**Answer-first**: open with 1–2 sentences that directly answer the title (the snippet AI
engines lift), then depth.

| # | Working title | Handle | Type | Primary internal links |
|---|---|---|---|---|
| 1 | How to Apply Press-On Nails So They Last 7 Days | `how-to-apply-press-on-nails` | how-to | `/fit`, top PDPs, guide #4 |
| 2 | Press-On Nail Sizing Guide: Find Your Exact Fit | `press-on-nail-sizing-guide` | how-to | `/fit`, `/shop`, guide #1 |
| 3 | Press-Ons vs Gel vs Acrylic: An Honest Comparison | `press-ons-vs-gel-vs-acrylic` | comparison | `/shop`, guides #1 & #4 |
| 4 | How to Remove Press-On Nails Without Damage | `how-to-remove-press-on-nails` | how-to | guide #1, `/fit` |

**Per-guide body structure (HTML in Shopify `contentHtml`):**
- Answer-first intro paragraph.
- Semantic `h2`/`h3` sections; numbered `<ol>` steps for how-tos; a `<table>` for guide #3.
- Closing mini-FAQ, 3–5 Q&A.
- 2–4 contextual internal links (PDPs/collections/`/fit`/sibling guides).
- Tags: `guide` + type tag (`howto` or `comparison`) + topic tags. Tags drive schema (below)
  and topical clustering.

## Schema enhancement

Extend `apps/web/app/journal/[handle]/page.tsx` to emit, in addition to BlogPosting:
- **HowTo** JSON-LD for `howto`-tagged guides (name, step list).
- **FAQPage** JSON-LD for the embedded mini-FAQ.

**Reality check (documented, not a blocker):** Google deprecated HowTo rich results (2023)
and restricted FAQ rich results to gov/health domains — neither will render SERP rich
snippets for this site. They are emitted for **AEO/GEO**: AI answer engines and crawlers use
this structured Q&A / step data to extract and cite content. That is the stated goal of this
phase, so both are worth shipping.

**Steps/FAQ data source — code-side registry (chosen):**
A typed registry keyed by article handle holds each guide's `howToSteps[]` and `faq[]`:
`apps/web/app/journal/guideSchema.ts`. The route looks up `article.handle`; if present, emits
HowTo/FAQPage from the registry. Prose lives in Shopify; structured schema lives in code,
both authored together.
- *Why not parse the HTML?* Parsing `<ol>`/FAQ out of `contentHtml` is fragile and breaks on
  edits. A registry is deterministic.
- *Trade-off (documented):* editing a guide's steps/FAQ in Shopify won't update the schema —
  the registry must be edited in tandem. Acceptable for 4 evergreen guides; the registry file
  carries a comment stating this coupling.

## Images

- Convert 4 relevant existing AVIF assets (`apps/web/public/images/...`) → webp (Shopify
  article images reject AVIF). Use `sips`/equivalent, quality ~80.
- Upload to Shopify Files (staged upload) and set each as the article's `image`.
- Mapping decided at author time (apply→hands/application shot, sizing→fit-related,
  comparison→nail closeup, removal→hands). Alt text written per image.

## Tooling (WAT: deterministic execution)

New script `tools/shopify_publish_guides.py`, following existing patterns
(`tools/shopify_auth.py` for Admin auth via client-credentials grant,
`tools/shopify_upload_product.py` for upload/idempotency style):
- Idempotent: look up article by handle; create via `articleCreate` or update via
  `articleUpdate` — safe to re-run (per CLAUDE.md idempotency rule).
- Handles staged image upload → Files → article image.
- Guide bodies stored as HTML files alongside the script (or inline) for review before run.
- Structured stdout logging, no secrets printed.

## Publishing flow (production-mutation gate)

1. Draft all 4 guide bodies (HTML) + the code-side registry + image mapping.
2. **Show drafts to user for review** (content correctness, voice, links).
3. On approval, run `tools/shopify_publish_guides.py` → creates the 4 articles + images.
   This mutates production Shopify → explicit user go-ahead required (CLAUDE.md "ask before
   mutating production data").
4. Deploy the route schema change (registry + HowTo/FAQ emit) via the normal PR→preview→main
   flow.

## Out of scope (later Phase 3 sub-projects)

- B. Use-case collection intros, C. homepage/shop body-copy expansion, D. internal-linking
  surfaces (related products via the `shopify--discovery--product_recommendation` metafields
  already on the store). Tracked separately.

## Discovered constraints (self-improvement log)

- **`sips` cannot write webp on this macOS host** (`Can't write format org.webmproject.webp`).
  The publisher converts AVIF→**JPEG** instead (Shopify accepts it). Fixed in tool.
- **`stagedUploadsCreate` returns `ACCESS_DENIED` for the client-credentials Admin token**
  even with `write_files` scope granted. App-only (client-credentials) tokens appear unable
  to use staged uploads. Consequence: the publisher's image step fails gracefully and
  articles publish **imageless**. To attach images, either (a) run the staged upload under a
  different auth (e.g. the Shopify MCP merchant session) then `articleUpdate` the image, or
  (b) add images manually in Shopify admin, or (c) `fileCreate` from a public image URL.
- **`/journal/[handle]` SSG + stale build:** `next start` against a build made when the blog
  had 0 articles 500s on newly published handles. A fresh build (every Vercel deploy) renders
  them 200. Not a code bug — verified via `next dev` (200 + full schema).
- **JSON-LD must be one object per `<script>`**, not a single array — array-form blocks throw
  in consumers reading `parsed["@context"]` per script. Fixed in `SiteSchema.tsx`.

## Verification

1. `tools/shopify_publish_guides.py` run → 4 articles live; re-run is a no-op/update (idempotent).
2. `/journal` lists 4 guides with images; each `/journal/{handle}` renders prose + links.
3. `pnpm --filter web build` clean; route emits BlogPosting + HowTo + FAQPage for tagged guides.
4. Google Rich Results Test on each guide URL: all three schema types parse with zero errors
   (rich-result *display* not expected per the reality check above; **valid parse** is the bar).
5. Internal links resolve (no 404s); cross-links form the cluster.
