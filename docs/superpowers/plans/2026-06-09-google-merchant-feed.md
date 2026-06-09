# Google Merchant Center Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve a valid Google Merchant Center product feed from the headless storefront at `https://nailismo.com/feed/google.xml` so products link to `nailismo.com/product/<handle>` and get approved.

**Architecture:** A Next.js App Router Route Handler fetches products via the existing Storefront client and delegates to a pure builder function that emits RSS 2.0 XML with the Google `g:` namespace. One `<item>` per product (not per size variant). All XML-generation logic is a pure, unit-tested module; the route handler is a thin fetch→build→Response wrapper.

**Tech Stack:** Next.js 15 App Router (Route Handler), TypeScript (strict), Vitest, shared `@nailismo/shopify` Storefront client/queries/types.

**Spec:** `docs/superpowers/specs/2026-06-09-google-merchant-feed-design.md`

---

## File Structure

- `packages/shopify/src/queries.ts` — add `PRODUCTS_FEED_QUERY` (modify).
- `packages/shopify/src/types.ts` — add `ProductsFeedNode` + `ProductsFeedQueryResult` (modify).
- `apps/web/lib/feed/google-merchant-feed.ts` — pure builder + helpers (create).
- `apps/web/lib/feed/google-merchant-feed.test.ts` — Vitest unit tests (create).
- `apps/web/app/feed/google.xml/route.ts` — Route Handler (create).

All commands below run from `apps/web/` unless a path says otherwise.

---

## Task 0: Branch

- [ ] **Step 1: Create a feature branch (repo is on `main`)**

```bash
git checkout -b feat/google-merchant-feed
```

---

## Task 1: Shared feed query + types

**Files:**
- Modify: `packages/shopify/src/queries.ts` (append)
- Modify: `packages/shopify/src/types.ts` (append)

- [ ] **Step 1: Add the query to `packages/shopify/src/queries.ts`**

Append at end of file:

```ts
export const PRODUCTS_FEED_QUERY = /* GraphQL */ `
  query ProductsFeed($first: Int!) {
    products(first: $first) {
      nodes {
        handle
        title
        descriptionHtml
        vendor
        isGiftCard
        availableForSale
        featuredImage { url }
        images(first: 10) { nodes { url } }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
`;
```

- [ ] **Step 2: Add types to `packages/shopify/src/types.ts`**

Append at end of file (`ShopifyMoney` already exists in this file):

```ts
export type ProductsFeedNode = {
  handle: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  isGiftCard: boolean;
  availableForSale: boolean;
  featuredImage: { url: string } | null;
  images: { nodes: { url: string }[] };
  priceRange: { minVariantPrice: ShopifyMoney };
};

export type ProductsFeedQueryResult = {
  products: { nodes: ProductsFeedNode[] };
};
```

- [ ] **Step 3: Typecheck the web app (transpiles the shared package)**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (clean exit).

- [ ] **Step 4: Commit**

```bash
git add packages/shopify/src/queries.ts packages/shopify/src/types.ts
git commit -m "feat(shopify): add ProductsFeed query + types for Merchant feed"
```

---

## Task 2: Pure feed builder (TDD)

**Files:**
- Create: `apps/web/lib/feed/google-merchant-feed.ts`
- Test: `apps/web/lib/feed/google-merchant-feed.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/feed/google-merchant-feed.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { ProductsFeedNode } from "@nailismo/shopify/types";
import {
  stripEmoji,
  htmlToText,
  xmlEscape,
  buildGoogleMerchantFeed,
} from "./google-merchant-feed";

const SITE = "https://nailismo.com";

function product(overrides: Partial<ProductsFeedNode> = {}): ProductsFeedNode {
  return {
    handle: "pet-pals",
    title: "pet pals 🐾",
    descriptionHtml: "<p>Cute & cozy</p>",
    vendor: "Nailismo.com",
    isGiftCard: false,
    availableForSale: true,
    featuredImage: { url: "https://cdn.shopify.com/a.jpg" },
    images: {
      nodes: [
        { url: "https://cdn.shopify.com/a.jpg" },
        { url: "https://cdn.shopify.com/b.jpg" },
      ],
    },
    priceRange: { minVariantPrice: { amount: "17.99", currencyCode: "USD" } },
    ...overrides,
  };
}

describe("stripEmoji", () => {
  it("removes emoji and collapses whitespace", () => {
    expect(stripEmoji("pet pals 🐾")).toBe("pet pals");
  });
});

describe("htmlToText", () => {
  it("strips tags, decodes entities, truncates to 5000", () => {
    expect(htmlToText("<p>Cute &amp; cozy</p>")).toBe("Cute & cozy");
    expect(htmlToText("<p>" + "x".repeat(6000) + "</p>").length).toBe(5000);
  });
});

describe("xmlEscape", () => {
  it("escapes XML metacharacters", () => {
    expect(xmlEscape("a & b < c")).toBe("a &amp; b &lt; c");
  });
});

describe("buildGoogleMerchantFeed", () => {
  it("emits the g: namespace and a well-formed envelope", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<channel>");
    expect((xml.match(/<item>/g) ?? []).length).toBe(1);
    expect((xml.match(/<\/item>/g) ?? []).length).toBe(1);
  });

  it("links to the singular /product/ path on the custom domain", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain("<g:link>https://nailismo.com/product/pet-pals</g:link>");
  });

  it("strips emoji from the title", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain("pet pals");
    expect(xml).not.toContain("🐾");
  });

  it("formats price, availability, condition, brand, identifier_exists", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain("<g:price>17.99 USD</g:price>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
  });

  it("marks out-of-stock products", () => {
    const xml = buildGoogleMerchantFeed([product({ availableForSale: false })], SITE);
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
  });

  it("includes additional images excluding the featured one", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain(
      "<g:additional_image_link>https://cdn.shopify.com/b.jpg</g:additional_image_link>",
    );
    expect((xml.match(/additional_image_link/g) ?? []).length).toBe(2); // one open+close pair
  });

  it("excludes gift cards", () => {
    const xml = buildGoogleMerchantFeed([product({ isGiftCard: true })], SITE);
    expect((xml.match(/<item>/g) ?? []).length).toBe(0);
  });

  it("excludes products with no featured image", () => {
    const xml = buildGoogleMerchantFeed([product({ featuredImage: null })], SITE);
    expect((xml.match(/<item>/g) ?? []).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run lib/feed/google-merchant-feed.test.ts`
Expected: FAIL — cannot resolve `./google-merchant-feed` (module not created yet).

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/feed/google-merchant-feed.ts`:

```ts
import type { ProductsFeedNode } from "@nailismo/shopify/types";

// Emoji, pictographs, regional-indicator flags, variation selectors, ZWJ.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

export function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// CDATA-wrap free text; guard against a literal "]]>" terminator inside content.
function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function buildItem(p: ProductsFeedNode, site: string): string | null {
  if (p.isGiftCard) return null;
  const image = p.featuredImage?.url;
  if (!image) return null;

  const title = stripEmoji(p.title) || p.handle;
  const description = htmlToText(p.descriptionHtml) || title;
  const link = `${site}/product/${p.handle}`;
  const price = `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`;
  const availability = p.availableForSale ? "in_stock" : "out_of_stock";
  const brand = p.vendor || "Nailismo";

  const additional = p.images.nodes
    .map((n) => n.url)
    .filter((u) => u !== image)
    .slice(0, 10)
    .map((u) => `    <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`)
    .join("\n");

  return [
    "  <item>",
    `    <g:id>${xmlEscape(p.handle)}</g:id>`,
    `    <g:title>${cdata(title)}</g:title>`,
    `    <g:description>${cdata(description)}</g:description>`,
    `    <g:link>${xmlEscape(link)}</g:link>`,
    `    <g:image_link>${xmlEscape(image)}</g:image_link>`,
    additional,
    `    <g:availability>${availability}</g:availability>`,
    `    <g:price>${xmlEscape(price)}</g:price>`,
    "    <g:condition>new</g:condition>",
    `    <g:brand>${cdata(brand)}</g:brand>`,
    "    <g:identifier_exists>no</g:identifier_exists>",
    "  </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildGoogleMerchantFeed(
  products: ProductsFeedNode[],
  siteUrl: string,
): string {
  const site = siteUrl.replace(/\/$/, "");
  const items = products
    .map((p) => buildItem(p, site))
    .filter((x): x is string => x !== null)
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    "    <title>Nailismo</title>",
    `    <link>${xmlEscape(site)}</link>`,
    "    <description>Nailismo product feed for Google Merchant Center</description>",
    items,
    "  </channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run lib/feed/google-merchant-feed.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/feed/google-merchant-feed.ts lib/feed/google-merchant-feed.test.ts
git commit -m "feat(web): pure Google Merchant feed builder + tests"
```

---

## Task 3: Route handler

**Files:**
- Create: `apps/web/app/feed/google.xml/route.ts`

- [ ] **Step 1: Confirm Route Handler conventions for THIS Next version**

Per `apps/web/AGENTS.md`, this Next.js may differ from training data. Before writing, skim the local docs for Route Handler caching and the `revalidate` segment-config export:

Run: `ls node_modules/next/dist/docs/ 2>/dev/null && grep -rl "route handler\|revalidate" node_modules/next/dist/docs/ 2>/dev/null | head`
Read the matching guide if present. Confirm: (a) a dotted segment folder like `feed/google.xml` is a valid route, and (b) `export const revalidate = 3600` is the right cache knob for a Route Handler. If the installed version differs, adapt (e.g. serve at `app/feed/google/route.ts` → `/feed/google`, or use `fetch` cache options only) and note the change in the commit message.

- [ ] **Step 2: Write the route handler**

Create `apps/web/app/feed/google.xml/route.ts`:

```ts
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCTS_FEED_QUERY } from "@/lib/shopify/queries";
import type {
  ProductsFeedQueryResult,
  ProductsFeedNode,
} from "@/lib/shopify/types";
import { buildGoogleMerchantFeed } from "@/lib/feed/google-merchant-feed";

export const revalidate = 3600;

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://nailismo.com";

export async function GET() {
  let products: ProductsFeedNode[] = [];
  try {
    const data = await storefrontFetch<ProductsFeedQueryResult>(
      PRODUCTS_FEED_QUERY,
      { first: 250 },
      { revalidate: 3600 },
    );
    products = data.products.nodes;
  } catch (err) {
    // Never 500 the feed — emit a valid empty feed and log non-config errors.
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[feed/google] products:", err);
    }
  }

  const xml = buildGoogleMerchantFeed(products, SITE);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify against the running dev server**

In one terminal: `pnpm dev` (per memory: run via `apps/web` `pnpm dev`, NOT root `serve.mjs`).
In another:

```bash
curl -s -o /tmp/feed.xml -w "code=%{http_code} type=%{content_type}\n" http://localhost:3000/feed/google.xml
grep -c "<item>" /tmp/feed.xml
grep -o "<g:link>[^<]*</g:link>" /tmp/feed.xml | head -3
```

Expected: `code=200`, `type=application/xml; charset=utf-8`, item count > 0, every `g:link` is `http://localhost:3000/product/<handle>`-shaped on local (will be `nailismo.com` in prod via `NEXT_PUBLIC_SITE_URL`). Confirm no raw emoji and well-formed XML (open in a browser tab — it should render as an XML tree, not throw a parse error).

- [ ] **Step 5: Commit**

```bash
git add app/feed/google.xml/route.ts
git commit -m "feat(web): serve Google Merchant feed at /feed/google.xml"
```

---

## Task 4: Full test + typecheck gate, then push

- [ ] **Step 1: Run the full web test suite**

Run: `pnpm exec vitest run`
Expected: PASS (existing suites + the new feed tests).

- [ ] **Step 2: Typecheck the whole app**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Push the branch and open a PR (only when the user asks)**

```bash
git push -u origin feat/google-merchant-feed
gh pr create --fill
```

---

## Post-deploy manual steps (operator — not code)

These finish the fix; the feed alone does not. After the PR merges and prod deploys:

1. **Verify prod feed:** `curl -s https://nailismo.com/feed/google.xml | head` → valid XML, `g:link` values are `https://nailismo.com/product/<handle>`.
2. **Google Merchant Center** → Data sources → add product source → **Scheduled fetch** → URL `https://nailismo.com/feed/google.xml`, frequency daily.
3. **Disconnect/disable** the Shopify "Google & YouTube" sales-channel product sync (or remove its feed in Merchant Center). Otherwise it keeps submitting the dead `myshopify.com/products/<handle>` links and those items stay disapproved / conflict as duplicates.
4. After GMC's next fetch, check **Diagnostics** — the landing-page disapproval should clear.

---

## Notes / Self-Review

- **Spec coverage:** route (Task 3), query+types (Task 1), pure builder + all field mappings + exclusions (Task 2), tests (Task 2 Step 1), manual GMC/channel steps (post-deploy section), verification (Task 3 Step 4 + post-deploy). All spec sections mapped.
- **Out of scope (per spec):** `/products/`→`/product/` redirect, per-variant items, cursor pagination beyond 250, `google_product_category`.
- **Type consistency:** `ProductsFeedNode` / `ProductsFeedQueryResult` defined in Task 1 and consumed unchanged in Tasks 2–3; `buildGoogleMerchantFeed` / `stripEmoji` / `htmlToText` / `xmlEscape` names identical across test and implementation.
