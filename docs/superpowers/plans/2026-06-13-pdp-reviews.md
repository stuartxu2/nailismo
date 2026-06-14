# PDP Product Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render genuine product reviews on the PDP and emit `AggregateRating`/`Review` schema, both sourced from a single Shopify `custom.reviews` metafield, with zero output when no reviews exist.

**Architecture:** A Shopify product metafield (`custom.reviews`, type `json`, Storefront `PUBLIC_READ`) holds an array of real reviews. The PDP fetches it via the existing Storefront query, parses it with a tolerant pure module, renders a `ProductReviews` component only when reviews exist, and nests `aggregateRating` + `review` into the `Product` JSON-LD gated on the same parsed array. A Python `tools/` helper enters real review text into the metafield (it never generates content).

**Tech Stack:** Next.js 16 App Router (RSC), TypeScript, Vitest, Shopify Storefront + Admin GraphQL, Python 3.11 (`tools/`).

**Spec:** `docs/superpowers/specs/2026-06-13-pdp-reviews-design.md`
**Branch:** `feat/pdp-reviews`

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/app/products/[handle]/reviews.ts` | Pure parse + aggregate logic (no React, no I/O). |
| `apps/web/app/products/[handle]/reviews.test.ts` | Unit tests for the pure module. |
| `apps/web/app/products/[handle]/ProductReviews.tsx` | Visible review section; returns `null` when empty. |
| `apps/web/app/products/[handle]/page.tsx` | Parse reviews, render component, gate Product JSON-LD. |
| `packages/shopify/src/queries.ts` | Add `reviews` metafield to `PRODUCT_BY_HANDLE_QUERY`. |
| `packages/shopify/src/types.ts` | Add `reviews` field to `ShopifyProductDetail`. |
| `tools/shopify_reviews.py` | Seed real reviews: `setup-definition`, `add`, `list`, `clear`. |
| `workflows/seed_reviews.md` | SOP for the seeding process (gated — see Task 7). |

---

### Task 1: Reviews pure module (parse + aggregate)

**Files:**
- Create: `apps/web/app/products/[handle]/reviews.ts`
- Test: `apps/web/app/products/[handle]/reviews.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/products/[handle]/reviews.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseReviews, aggregate } from "./reviews";

const one = JSON.stringify([
  { author: "Riley P.", rating: 5, body: "Stayed on all week.", date: "2026-06-13" },
]);

describe("parseReviews", () => {
  it("returns [] for null/undefined/empty", () => {
    expect(parseReviews(null)).toEqual([]);
    expect(parseReviews(undefined)).toEqual([]);
    expect(parseReviews("")).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    expect(parseReviews("{not json")).toEqual([]);
  });

  it("returns [] when the JSON is not an array", () => {
    expect(parseReviews(JSON.stringify({ author: "x" }))).toEqual([]);
  });

  it("parses a valid review", () => {
    const out = parseReviews(one);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: "Riley P.", rating: 5, body: "Stayed on all week.", date: "2026-06-13" });
  });

  it("drops rows missing author/body/date", () => {
    const raw = JSON.stringify([
      { rating: 5, body: "no author", date: "2026-06-13" },
      { author: "A", rating: 5, date: "2026-06-13" },
      { author: "B", rating: 5, body: "no date" },
    ]);
    expect(parseReviews(raw)).toEqual([]);
  });

  it("drops rows whose rating is out of 1..5", () => {
    const raw = JSON.stringify([
      { author: "A", rating: 0, body: "x", date: "2026-06-13" },
      { author: "B", rating: 6, body: "x", date: "2026-06-13" },
    ]);
    expect(parseReviews(raw)).toEqual([]);
  });

  it("rounds fractional ratings and coerces flags", () => {
    const raw = JSON.stringify([
      { author: "A", rating: 4.4, body: "x", date: "2026-06-13", verified: true, incentivized: 1 },
    ]);
    const out = parseReviews(raw);
    expect(out[0].rating).toBe(4);
    expect(out[0].verified).toBe(true);
    expect(out[0].incentivized).toBe(false); // only strict true counts
  });
});

describe("aggregate", () => {
  it("returns null for an empty list", () => {
    expect(aggregate([])).toBeNull();
  });

  it("computes count and average rounded to one decimal", () => {
    const out = parseReviews(JSON.stringify([
      { author: "A", rating: 5, body: "x", date: "2026-06-13" },
      { author: "B", rating: 5, body: "x", date: "2026-06-13" },
      { author: "C", rating: 4, body: "x", date: "2026-06-13" },
    ]));
    expect(aggregate(out)).toEqual({ ratingValue: 4.7, reviewCount: 3 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web exec vitest run reviews`
Expected: FAIL — cannot resolve `./reviews` / `parseReviews is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Create `apps/web/app/products/[handle]/reviews.ts`:

```ts
// Pure parse + aggregate for PDP reviews. No React, no I/O — unit-testable.
// Reviews originate from a Shopify `custom.reviews` JSON metafield; this module
// is deliberately tolerant so a malformed metafield degrades to the (safe) zero
// state instead of throwing during a server render.

export type Review = {
  author: string;
  rating: number; // integer 1..5
  title?: string;
  body: string;
  date: string; // YYYY-MM-DD -> datePublished
  verified?: boolean;
  incentivized?: boolean;
};

export function parseReviews(value: string | null | undefined): Review[] {
  if (!value) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const out: Review[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const author = typeof o.author === "string" ? o.author.trim() : "";
    const body = typeof o.body === "string" ? o.body.trim() : "";
    const date = typeof o.date === "string" ? o.date.trim() : "";
    const rating = typeof o.rating === "number" ? Math.round(o.rating) : NaN;

    if (!author || !body || !date) continue;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    out.push({
      author,
      rating,
      body,
      date,
      title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : undefined,
      verified: o.verified === true,
      incentivized: o.incentivized === true,
    });
  }
  return out;
}

export function aggregate(
  reviews: Review[],
): { ratingValue: number; reviewCount: number } | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const ratingValue = Math.round((sum / reviews.length) * 10) / 10;
  return { ratingValue, reviewCount: reviews.length };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web exec vitest run reviews`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/products/[handle]/reviews.ts" "apps/web/app/products/[handle]/reviews.test.ts"
git commit -m "feat(web): add tolerant PDP review parse/aggregate module"
```

---

### Task 2: Storefront query + type for the reviews metafield

**Files:**
- Modify: `packages/shopify/src/queries.ts` (`PRODUCT_BY_HANDLE_QUERY`)
- Modify: `packages/shopify/src/types.ts` (`ShopifyProductDetail`)

- [ ] **Step 1: Add the metafield to the query**

In `packages/shopify/src/queries.ts`, inside `PRODUCT_BY_HANDLE_QUERY`, add the
`reviews` alias immediately after the `vendor` line:

```graphql
      vendor
      reviews: metafield(namespace: "custom", key: "reviews") {
        value
      }
```

- [ ] **Step 2: Add the field to the type**

In `packages/shopify/src/types.ts`, inside `ShopifyProductDetail`, add after the
`vendor` field:

```ts
  vendor: string;
  reviews: { value: string | null } | null;
```

(If `vendor` is not present in `ShopifyProductDetail`, add the `reviews` line
adjacent to the other scalar fields — it is an optional metafield wrapper.)

- [ ] **Step 3: Verify types compile**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: exit 0, no errors. The new `product.reviews?.value` becomes available
to the PDP.

- [ ] **Step 4: Commit**

```bash
git add packages/shopify/src/queries.ts packages/shopify/src/types.ts
git commit -m "feat(shopify): read custom.reviews metafield in product query"
```

---

### Task 3: ProductReviews component

**Files:**
- Create: `apps/web/app/products/[handle]/ProductReviews.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/app/products/[handle]/ProductReviews.tsx`:

```tsx
// Visible PDP review section. Renders nothing when there are no reviews, so the
// PDP shows a review block only when genuine reviews exist in the metafield.
// The matching AggregateRating/Review schema is emitted in page.tsx from the
// same parsed array.
import type { Review } from "./reviews";
import { aggregate } from "./reviews";

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="candy-stars" aria-label={`${rating} out of 5 stars`}>
      {"★★★★★".slice(0, full)}
      {"☆☆☆☆☆".slice(0, 5 - full)}
    </span>
  );
}

export function ProductReviews({
  reviews,
  productTitle,
}: {
  reviews: Review[];
  productTitle: string;
}) {
  const agg = aggregate(reviews);
  if (!agg) return null;

  return (
    <section style={{ marginTop: 56 }}>
      <span className="candy-eyebrow">Reviews</span>
      <h2 style={{ fontSize: "clamp(28px,4vw,48px)", marginTop: 10, marginBottom: 8 }}>
        What buyers say
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Stars rating={agg.ratingValue} />
        <span style={{ fontFamily: "var(--body)", fontWeight: 800 }}>
          {agg.ratingValue.toFixed(1)} · {agg.reviewCount}{" "}
          {agg.reviewCount === 1 ? "review" : "reviews"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 22,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {reviews.map((r, i) => (
          <figure key={`${r.author}-${i}`} className="candy-review">
            <Stars rating={r.rating} />
            {r.title && (
              <h3 style={{ fontSize: 18, margin: "12px 0 6px" }}>{r.title}</h3>
            )}
            <blockquote
              style={{ fontSize: 17, fontWeight: 700, margin: "10px 0 14px", lineHeight: 1.45 }}
            >
              “{r.body}”
            </blockquote>
            <figcaption style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)" }}>
              {r.author}
              {r.verified && (
                <span style={{ color: "var(--bubblegum-d)" }}> · Verified buyer</span>
              )}
            </figcaption>
            {r.incentivized && (
              <p style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                Received free product in exchange for an honest review.
              </p>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: exit 0. (Component is unused until Task 4 — tsc still type-checks it.)

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/products/[handle]/ProductReviews.tsx"
git commit -m "feat(web): add ProductReviews component (null when empty)"
```

---

### Task 4: Wire reviews into the PDP (render + schema gating)

**Files:**
- Modify: `apps/web/app/products/[handle]/page.tsx`

- [ ] **Step 1: Add imports**

In `apps/web/app/products/[handle]/page.tsx`, after the existing
`import { ProductFaq } from "./ProductFaq";` line, add:

```tsx
import { ProductFaq } from "./ProductFaq";
import { ProductReviews } from "./ProductReviews";
import { parseReviews, aggregate } from "./reviews";
```

- [ ] **Step 2: Parse reviews in the page body**

In `ProductPage`, just after `const price = defaultVariant?.price ?? product.priceRange.minVariantPrice;`, add:

```tsx
  const reviews = parseReviews(product.reviews?.value);
  const reviewAgg = aggregate(reviews);
```

- [ ] **Step 3: Gate the Product JSON-LD on the parsed reviews**

Replace the existing `const jsonLd = [ ... ];` array. Build the Product node as a
mutable object and attach `aggregateRating` + `review` only when reviews exist:

```tsx
  const productNode: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.descriptionHtml.replace(/<[^>]+>/g, "").slice(0, 5000),
    image: images.map((i) => i.url),
    brand: { "@type": "Brand", name: product.vendor || "Nailismo" },
    offers: {
      "@type": "Offer",
      price: Number(price.amount).toFixed(2),
      priceCurrency: price.currencyCode,
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: productUrl,
    },
  };

  if (reviewAgg) {
    productNode.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewAgg.ratingValue,
      reviewCount: reviewAgg.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
    productNode.review = reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      reviewBody: r.body,
      datePublished: r.date,
      ...(r.title ? { name: r.title } : {}),
    }));
  }

  const jsonLd = [
    productNode,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
        { "@type": "ListItem", position: 3, name: product.title, item: productUrl },
      ],
    },
  ];
```

- [ ] **Step 4: Render the component**

Immediately after the existing `<ProductFaq ... />` line, add:

```tsx
        <ProductFaq title={product.title} productType={product.productType} />

        <ProductReviews reviews={reviews} productTitle={product.title} />
```

- [ ] **Step 5: Verify it compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Smoke-test the zero state (no reviews seeded yet)**

```bash
cd apps/web && PORT=3111 pnpm dev > /tmp/rev-dev.log 2>&1 &
curl -sf --retry 5 --retry-connrefused --max-time 60 http://localhost:3111/products/midnight-circuit \
  | grep -oE '"@type":"(AggregateRating|Review)"' | sort | uniq -c
lsof -tiTCP:3111 -sTCP:LISTEN | xargs kill
```
Expected: **no output** (no AggregateRating/Review schema) because no product has
a `custom.reviews` metafield yet, and the review section is absent. This proves
the zero state is clean.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/products/[handle]/page.tsx"
git commit -m "feat(web): render reviews + gate AggregateRating/Review on real data"
```

---

### Task 5: Seeding tool (`tools/shopify_reviews.py`)

**Files:**
- Create: `tools/shopify_reviews.py`

> This tool enters review text the owner supplies. It does not generate reviews.

- [ ] **Step 1: Write the tool**

Create `tools/shopify_reviews.py`:

```python
#!/usr/bin/env python3
"""Seed/manage genuine product reviews in the Shopify `custom.reviews` metafield.

The PDP reads this metafield (Storefront PUBLIC_READ) and only then renders a
review section + AggregateRating/Review schema. This tool never invents review
content — it stores text the owner provides from real early customers.

Subcommands:
  setup-definition                 create the custom.reviews metafield definition (idempotent)
  list   --product <handle>        print current reviews for a product
  add    --product <handle> --author "Riley P." --rating 5 --body "..." \\
         [--title "..."] [--date YYYY-MM-DD] [--verified] [--incentivized]
  clear  --product <handle>        remove all reviews for a product

Env: loaded by shopify_auth.load_env() from apps/web/.env.local.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import sys
import urllib.error
import urllib.request

from shopify_auth import load_env, get_admin_token

NAMESPACE = "custom"
KEY = "reviews"


def gql(env: dict[str, str], token: str, query: str, variables: dict | None = None) -> dict:
    url = f"https://{env['SHOPIFY_STORE_DOMAIN']}/admin/api/{env['SHOPIFY_API_VERSION']}/graphql.json"
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "X-Shopify-Access-Token": token},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        sys.exit(f"admin API error: HTTP {exc.code}: {exc.read().decode()[:500]}")
    if payload.get("errors"):
        sys.exit(f"GraphQL errors: {json.dumps(payload['errors'])[:500]}")
    return payload["data"]


DEFINITION_CREATE = """
mutation($def: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $def) {
    createdDefinition { id name }
    userErrors { field message code }
  }
}
"""

PRODUCT_BY_HANDLE = """
query($q: String!) {
  products(first: 1, query: $q) {
    edges { node { id title metafield(namespace: "custom", key: "reviews") { value } } }
  }
}
"""

METAFIELDS_SET = """
mutation($mf: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $mf) {
    metafields { id }
    userErrors { field message code }
  }
}
"""


def setup_definition(env: dict[str, str], token: str) -> None:
    data = gql(env, token, DEFINITION_CREATE, {
        "def": {
            "name": "Reviews",
            "namespace": NAMESPACE,
            "key": KEY,
            "type": "json",
            "ownerType": "PRODUCT",
            "access": {"storefront": "PUBLIC_READ"},
        },
    })
    res = data["metafieldDefinitionCreate"]
    errs = res["userErrors"]
    if errs:
        # "TAKEN" means the definition already exists — idempotent success.
        if all(e.get("code") == "TAKEN" for e in errs):
            print("[reviews] definition already exists — ok")
            return
        sys.exit(f"definition errors: {json.dumps(errs)}")
    print(f"[reviews] created definition {res['createdDefinition']['id']}")


def _product(env: dict[str, str], token: str, handle: str) -> tuple[str, list[dict]]:
    data = gql(env, token, PRODUCT_BY_HANDLE, {"q": f"handle:{handle}"})
    edges = data["products"]["edges"]
    if not edges:
        sys.exit(f"no product with handle '{handle}'")
    node = edges[0]["node"]
    raw = node["metafield"]["value"] if node["metafield"] else None
    reviews = json.loads(raw) if raw else []
    if not isinstance(reviews, list):
        reviews = []
    return node["id"], reviews


def _write(env: dict[str, str], token: str, product_id: str, reviews: list[dict]) -> None:
    data = gql(env, token, METAFIELDS_SET, {
        "mf": [{
            "ownerId": product_id,
            "namespace": NAMESPACE,
            "key": KEY,
            "type": "json",
            "value": json.dumps(reviews, ensure_ascii=False),
        }],
    })
    errs = data["metafieldsSet"]["userErrors"]
    if errs:
        sys.exit(f"metafieldsSet errors: {json.dumps(errs)}")


def cmd_list(env, token, args) -> None:
    _, reviews = _product(env, token, args.product)
    print(json.dumps(reviews, indent=2, ensure_ascii=False))
    print(f"[reviews] {len(reviews)} review(s) on '{args.product}'")


def cmd_add(env, token, args) -> None:
    if not (1 <= args.rating <= 5):
        sys.exit("--rating must be 1..5")
    product_id, reviews = _product(env, token, args.product)
    entry = {
        "author": args.author,
        "rating": args.rating,
        "body": args.body,
        "date": args.date or _dt.date.today().isoformat(),
        "verified": bool(args.verified),
        "incentivized": bool(args.incentivized),
    }
    if args.title:
        entry["title"] = args.title
    reviews.append(entry)
    _write(env, token, product_id, reviews)
    print(f"[reviews] added review by {args.author} to '{args.product}' (now {len(reviews)})")


def cmd_clear(env, token, args) -> None:
    product_id, reviews = _product(env, token, args.product)
    _write(env, token, product_id, [])
    print(f"[reviews] cleared {len(reviews)} review(s) from '{args.product}'")


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage Shopify custom.reviews metafield")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("setup-definition")

    p_list = sub.add_parser("list")
    p_list.add_argument("--product", required=True)

    p_add = sub.add_parser("add")
    p_add.add_argument("--product", required=True)
    p_add.add_argument("--author", required=True)
    p_add.add_argument("--rating", type=int, required=True)
    p_add.add_argument("--body", required=True)
    p_add.add_argument("--title")
    p_add.add_argument("--date")
    p_add.add_argument("--verified", action="store_true")
    p_add.add_argument("--incentivized", action="store_true")

    p_clear = sub.add_parser("clear")
    p_clear.add_argument("--product", required=True)

    args = parser.parse_args()
    env = load_env()
    token = get_admin_token(env)

    if args.cmd == "setup-definition":
        setup_definition(env, token)
    elif args.cmd == "list":
        cmd_list(env, token, args)
    elif args.cmd == "add":
        cmd_add(env, token, args)
    elif args.cmd == "clear":
        cmd_clear(env, token, args)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Lint/compile check (no Shopify call)**

Run: `python -m py_compile tools/shopify_reviews.py`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add tools/shopify_reviews.py
git commit -m "feat(tools): shopify_reviews.py to seed real PDP reviews"
```

> **PRODUCTION GATE:** Actually running `setup-definition` and `add` mutates the
> live Shopify store. Do NOT run them without explicit owner approval (per
> CLAUDE.md "Ask before mutating production data"). Verification of the populated
> state (Task 6) is gated on that approval.

---

### Task 6: Verify the populated state (gated on owner approval)

**Files:** none (verification only).

- [ ] **Step 1: One-time definition (after owner says go)**

Run: `python tools/shopify_reviews.py setup-definition`
Expected: `created definition ...` or `definition already exists — ok`.

- [ ] **Step 2: Seed one genuine review supplied by the owner**

Run (example — owner provides the real text):
```bash
python tools/shopify_reviews.py add --product midnight-circuit \
  --author "Riley P." --rating 5 --body "First time with press-ons and they lasted all week." \
  --verified
```
Expected: `added review by Riley P. ... (now 1)`.

- [ ] **Step 2b: Confirm the metafield reads back**

Run: `python tools/shopify_reviews.py list --product midnight-circuit`
Expected: the JSON review printed, count `1`.

- [ ] **Step 3: Confirm the PDP renders it + emits schema**

```bash
cd apps/web && PORT=3111 pnpm dev > /tmp/rev-dev.log 2>&1 &
curl -sf --retry 5 --retry-connrefused --max-time 60 http://localhost:3111/products/midnight-circuit \
  | grep -oE '"@type":"(AggregateRating|Review)"' | sort | uniq -c
lsof -tiTCP:3111 -sTCP:LISTEN | xargs kill
```
Expected: one `AggregateRating` and one `Review`. (Storefront cache: allow up to
the 120s product revalidate window, or restart dev.)

- [ ] **Step 4: Validate structured data**

Paste the PDP HTML or URL into Google's Rich Results Test (or
`https://validator.schema.org/`). Expected: Product with valid `aggregateRating`
+ `review`, no errors.

---

### Task 7: Seeding SOP (gated — create only with explicit approval)

**Files:**
- Create: `workflows/seed_reviews.md`

> CLAUDE.md forbids creating workflows without explicit user approval. Confirm
> before writing this file.

- [ ] **Step 1: Confirm with the owner**, then create `workflows/seed_reviews.md`:

```markdown
# Workflow: Seed PDP Reviews

**Purpose:** Add genuine product reviews so PDPs render reviews + AggregateRating/
Review schema. Never fabricate reviews (FTC + Google policy).

## One-time
1. `python tools/shopify_reviews.py setup-definition`
   Creates the `custom.reviews` metafield definition (Storefront PUBLIC_READ).

## Per review (real customer text only)
2. `python tools/shopify_reviews.py add --product <handle> --author "First L." \
   --rating <1-5> --body "<their words>" [--title "..."] [--verified] [--incentivized]`
   - Use `--incentivized` whenever the reviewer got free product; the PDP then
     shows the FTC disclosure.
3. `python tools/shopify_reviews.py list --product <handle>` to confirm.

## Replace seed with organic reviews
4. `python tools/shopify_reviews.py clear --product <handle>` once real organic
   reviews exist, then re-add the genuine ones (or migrate to a review app).

## Constraints
- Reviews must come from real people. No AI/fabricated content.
- `--author` = first name + last initial (privacy).
- Storefront cache: PDP updates within the product revalidate window (~120s).
```

- [ ] **Step 2: Commit**

```bash
git add workflows/seed_reviews.md
git commit -m "docs(workflows): SOP for seeding genuine PDP reviews"
```

---

## Self-Review

**Spec coverage:**
- Data model / field rules → Task 1 (parse validation), Task 5 (`add` flags). ✓
- Metafield `custom.reviews`, json, PUBLIC_READ → Task 2 (read), Task 5 `setup-definition`. ✓
- Read path (query + tolerant parse/aggregate) → Tasks 1, 2. ✓
- Render gated on length, reuse candy styles, badges, placement below FAQ → Tasks 3, 4. ✓
- Schema gating (aggregateRating + review from same array, none when empty) → Task 4. ✓
- Seeding tool (setup/add/list/clear, Admin auth, idempotent, structured logs) → Task 5. ✓
- SOP (approval-gated) → Task 7. ✓
- Testing/verification (unit, zero state, populated, tsc) → Tasks 1, 4.6, 6. ✓
- FTC disclosure visible on card → Task 3 (`incentivized`), Task 5 (`--incentivized`). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `Review`, `parseReviews`, `aggregate` defined in Task 1 and
used with identical names/signatures in Tasks 3 and 4. Metafield shape
`{ value: string | null } | null` defined in Task 2 and read as `product.reviews?.value`
in Task 4. Tool namespace/key (`custom`/`reviews`) consistent across Tasks 2 and 5. ✓
