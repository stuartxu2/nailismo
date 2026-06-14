# PDP Product Reviews — Design Spec

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation plan
**Scope:** Product detail page (PDP) reviews — display + `AggregateRating`/`Review` schema, sourced only from genuine reviews.

## Problem

Nailismo is a brand-new store with zero reviews. The SEO/GEO/AEO audit flagged the
absence of `AggregateRating`/`Review` schema on PDPs as the highest-leverage gap
(star rich-results in SERP + trust signals that LLM answer engines cite).

Reviews cannot be fabricated:

- **FTC fake-review rule** (in force since Oct 2024): fabricated/AI-generated
  consumer reviews presented as real carry civil penalties up to ~$51.7k per review.
- **Google structured-data policy**: `AggregateRating`/`Review` markup must reflect
  genuine, independently-collected reviews. Fake review schema is a top trigger for
  a manual action → loss of rich results sitewide and degraded domain trust — the
  opposite of the audit goal.

So the system must **only ever render and mark up real reviews**, and emit **no
review schema at all** until genuine reviews exist. The owner seeds genuine reviews
from early testers (with FTC disclosure for gifted product), and deletes the seed
when organic reviews replace it.

## Goals

- Zero reviews → no review UI, no `AggregateRating`, no `Review` schema. Clean.
- One or more reviews → review section renders + schema lights up automatically.
- Visible reviews and marked-up reviews come from one source (Google requires the
  markup to match on-page content).
- Shopify stays the source of truth (no third-party app, no local data file).
- Easy to add / edit / delete reviews without hand-editing raw JSON.
- FTC-compliant disclosure for incentivized (gifted) reviews.

## Non-Goals

- Customer-submitted review flow (owner is seeding; not needed yet).
- Third-party review app (Judge.me/Loox/Okendo) — revisit if/when customer
  submission at scale is wanted.
- Homepage hardcoded testimonials (`CandyHome.tsx`) — out of scope; flagged
  separately to the owner.
- Compact rating badge near the buy box — possible later add, not in this scope.

## Data Source

A single per-product Shopify metafield:

- Namespace / key: `custom.reviews`
- Type: `json`
- Storefront API access: `PUBLIC_READ` (required for the headless read path)

Value is a JSON array of review objects:

```json
[
  {
    "author": "Riley P.",
    "rating": 5,
    "title": "Lasted all week",
    "body": "First time wearing press-ons and they stayed on a whole week.",
    "date": "2026-06-13",
    "verified": true,
    "incentivized": false
  }
]
```

Field rules:

| Field | Type | Required | Notes |
|---|---|---|---|
| `author` | string | yes | First name + last initial (privacy). |
| `rating` | int 1–5 | yes | Clamped/validated on read; invalid row dropped. |
| `title` | string | no | Short headline. |
| `body` | string | yes | Review text. |
| `date` | ISO date (`YYYY-MM-DD`) | yes | → `datePublished`. |
| `verified` | bool | no | Renders a "Verified buyer" badge. |
| `incentivized` | bool | no | `true` → FTC disclosure badge ("Received free product for an honest review"). |

Empty array or absent metafield = the zero state.

## Read Path

1. Extend `PRODUCT_BY_HANDLE_QUERY` (in `packages/shopify/src/queries.ts`) with:
   ```graphql
   reviews: metafield(namespace: "custom", key: "reviews") { value }
   ```
   No extra network round trip — folded into the existing product fetch.
2. Add `reviews?: { value: string } | null` to `ShopifyProductDetail` in
   `packages/shopify/src/types.ts`.
3. New pure module `apps/web/app/products/[handle]/reviews.ts`:
   - `type Review` (parsed, validated shape).
   - `parseReviews(value: string | null | undefined): Review[]` — tolerant: invalid
     JSON, non-array, or malformed rows → those rows dropped; never throws.
   - `aggregate(reviews: Review[]): { ratingValue: number; reviewCount: number } | null`
     — `null` when empty; otherwise average rounded to 1 decimal + count.
   - Co-located `reviews.test.ts` (mirrors `guideSchema.test.ts`): malformed JSON →
     `[]`; rating clamp/drop; average rounding; empty → `null` aggregate.

## Render + Schema Gating

**`apps/web/app/products/[handle]/ProductReviews.tsx`** (server component):

- Props: `reviews: Review[]`, `productTitle: string`.
- `reviews.length === 0` → returns `null`. Nothing renders.
- Otherwise: header with average ★ + count, then review cards reusing existing
  `candy-stars` and `candy-review` styles; per-card `verified` / `incentivized`
  badges. Placed below `ProductFaq`, above `UgcStrip`.

**Schema in `page.tsx`** — gated on the same parsed array:

- Parse `product.reviews?.value` once.
- When non-empty, nest into the existing `Product` JSON-LD node:
  - `aggregateRating`: `{ "@type": "AggregateRating", ratingValue, reviewCount, bestRating: 5, worstRating: 1 }`
  - `review`: array of `{ "@type": "Review", author: { "@type": "Person", name }, reviewRating: { "@type": "Rating", ratingValue, bestRating: 5 }, reviewBody, datePublished }`
- When empty, the `Product` node is emitted unchanged (no `aggregateRating`, no `review`).

Because the visible cards and the schema are built from the same `Review[]`, the
"markup must match visible content" rule holds by construction. There is no code
path that emits review schema without rendering the matching reviews.

## Seeding Workflow (genuine data entry)

The tooling enters real review text supplied by the owner — it never generates
review content.

1. **One-time setup** — `tools/shopify_reviews.py setup-definition`: creates the
   `custom.reviews` metafield definition (Admin API, type `json`, Storefront
   `PUBLIC_READ`). Uses existing Admin auth (`tools/shopify_auth.py`). Idempotent.
2. **Per-product** — `tools/shopify_reviews.py add|list|clear`:
   - `add --product <handle> --author "Riley P." --rating 5 --body "…" [--title …] [--verified] [--incentivized] [--date YYYY-MM-DD]`
     reads the current metafield JSON, appends, writes back via `metafieldsSet`.
   - `list --product <handle>` prints current reviews.
   - `clear --product <handle>` empties the seed (used when organic reviews replace it).
   - Structured stdout logs; idempotent; never logs secrets.
3. **SOP** — `workflows/seed_reviews.md` documents the process (created only with
   explicit owner approval, per repo rules).

## Testing / Verification

- Unit (`reviews.test.ts`): parse tolerance, rating validation, average rounding,
  empty → `null` aggregate.
- Zero state: a product with no metafield renders no review section and emits a
  `Product` node with no `aggregateRating`/`review`.
- Populated state: seed one product, confirm cards render and the `Product` JSON-LD
  carries matching `aggregateRating` + `review`; validate with a structured-data
  test.
- `tsc --noEmit` clean.

## Risks / Notes

- Storefront API requires the metafield definition to grant `PUBLIC_READ`; without
  it the read returns `null` and the system stays in the (safe) zero state.
- `page.tsx` is also edited on the open SEO branch (`feat/seo-geo-sitemap-llms-pdp`,
  PR #25), but in a different region (`generateMetadata`) than this work (`jsonLd`
  + render). Non-overlapping; low merge-conflict risk.
- FTC disclosure copy for incentivized reviews must be visible on the card, not
  only in a tooltip.
