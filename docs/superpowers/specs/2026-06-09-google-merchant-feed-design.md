# Google Merchant Center Feed — Design

> Date: 2026-06-09
> Status: Approved (brainstorm), pending implementation plan

## Problem

Google Shopping disapproved imported products ("product wasn't approved"). The feed
link Google holds is `https://n2kktm-sk.myshopify.com/products/<handle>` — wrong on
two axes:

1. **Domain** — `myshopify.com`, not `nailismo.com`. The custom domain points to
   Vercel (headless storefront), so Shopify's primary domain stays the `myshopify`
   one and its Google channel emits that.
2. **Path** — Shopify emits `/products/` (plural); the headless storefront serves
   `/product/` (singular).

The `myshopify` Online Store is **password-protected** (headless). Google's crawler
hits the password gate instead of a product page → landing page disapproved.

Confirmed live:

| URL | Result |
|---|---|
| `nailismo.com/product/pet-pals` (real storefront) | 200 ✓ |
| `nailismo.com/products/pet-pals` (plural) | 404 |
| `n2kktm-sk.myshopify.com/products/pet-pals` | 200 = password gate, not product |

Root cause: the feed comes from Shopify's "Google & YouTube" sales channel, which
always uses the Online Store channel URL — dead in a headless build. Shopify-side
domain settings can't fix it (the custom domain is on Vercel), and a Vercel redirect
can never run for the `myshopify.com` domain.

## Goal

Serve a correct Google Merchant Center product feed from the headless storefront so
products link to `https://nailismo.com/product/<handle>` and get approved.

Success criteria:
- `https://nailismo.com/feed/google.xml` returns valid RSS 2.0 GMC XML.
- Every `<item>` `g:link` points at `nailismo.com/product/<handle>` (200).
- Feed passes GMC feed validation.
- After GMC scheduled-fetch + disconnecting the Shopify channel sync, the
  landing-page disapproval clears in Diagnostics.

## Catalog data shape (verified live)

- Each product has one option **Size** (S/M/L/XL) → 4 variants.
- All variants share price ($17.99 for core sets), image, availability.
- `sku` is null; no barcode/GTIN. Storefront API does not expose barcode regardless.
- `compareAtPrice` null (no active sale price).
- `vendor` = "Nailismo.com".
- The PDP does **not** read a `?variant`/`?size` deep-link param — size is chosen
  client-side via the scanner.

## Decision: one item per product

Chosen over one-item-per-variant. Rationale: all variants share price/image/
availability, the PDP can't deep-link to a size, and the disapproval is about the
dead landing page — not variant granularity. GMC fully supports single-item products.
Smaller feed, less code. Size-level grouping can be added later if Diagnostics ever
flags it.

## Architecture

### 1. Route handler
`apps/web/app/feed/google.xml/route.ts` → `https://nailismo.com/feed/google.xml`.

- Returns RSS 2.0 XML, root `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`.
- `Content-Type: application/xml; charset=utf-8`.
- `export const revalidate = 3600` (hourly cache; GMC fetches ~daily).
- Thin: fetch products → `buildGoogleMerchantFeed(products, siteUrl)` → `Response`.
- Site URL from `NEXT_PUBLIC_SITE_URL` (fallback `https://nailismo.com`), trailing
  slash stripped — same convention as `app/sitemap.ts`.
- On `ShopifyConfigError` / fetch failure: log and return a valid empty feed (no 500).

### 2. Query
New `PRODUCTS_FEED_QUERY` in `packages/shopify/src/queries.ts` + result type in
`packages/shopify/src/types.ts`:

```graphql
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
```

- `first: 250` (Storefront API max single page). Catalog is well under 250; documented
  limitation — add cursor pagination only when the catalog approaches the cap.
- Fetched via existing `storefrontFetch` with `{ revalidate: 3600 }`.

### 3. Pure builder
`apps/web/lib/feed/google-merchant-feed.ts`:
`buildGoogleMerchantFeed(products: ProductsFeedNode[], siteUrl: string): string`.

Per product `<item>`:

| GMC field | Source / rule |
|---|---|
| `g:id` | handle |
| `g:title` | title, emoji stripped, whitespace collapsed (CDATA) |
| `g:description` | descriptionHtml → plain text, ≤5000 chars, fallback to title (CDATA) |
| `g:link` | `{siteUrl}/product/{handle}` |
| `g:image_link` | `featuredImage.url` |
| `g:additional_image_link` | up to 10 `images` excluding the featured one |
| `g:price` | `{amount} {currencyCode}` (e.g. `17.99 USD`) |
| `g:availability` | `availableForSale ? in_stock : out_of_stock` |
| `g:condition` | `new` |
| `g:brand` | `vendor` || `Nailismo` |
| `g:identifier_exists` | `no` |

Helpers (pure, unit-tested):
- `stripEmoji(s)` — remove emoji + pictographs, collapse whitespace, trim.
- `htmlToText(html)` — strip tags, decode basic entities, collapse whitespace, truncate 5000.
- `xmlEscape(s)` — for plain-text fields (`g:link`, `g:price`); titles/descriptions use CDATA.

Exclusions (item omitted):
- `isGiftCard === true`.
- No `featuredImage` (GMC requires an image).

Omitted in v1: `google_product_category` (GMC auto-categorizes; a blanket category
would mis-tag the consumable SKUs). `g:sale_price` (no `compareAtPrice` data). `g:gtin`/
`g:mpn` (none exist → `identifier_exists: no`).

### 4. Tests
Vitest on the pure builder (`google-merchant-feed.test.ts`):
- `&` and `<` escaped correctly in `g:link`/`g:price`.
- Emoji stripped from title (`pet pals 🐾` → `pet pals`).
- HTML description → plain text, truncated at 5000.
- Gift-card product excluded.
- Imageless product excluded.
- `g:link` is `https://nailismo.com/product/<handle>`.
- Output is well-formed XML with the `g:` namespace.

## Manual steps (post-deploy — operator, not code)

1. **Google Merchant Center** → Data sources → add product source → **scheduled fetch**
   → URL `https://nailismo.com/feed/google.xml`, daily.
2. **Disconnect / disable** the Shopify "Google & YouTube" sales channel product sync,
   or remove its feed in Merchant Center — otherwise it keeps submitting the dead
   `myshopify.com/products/` links and those items stay disapproved alongside the good
   ones (duplicate-item conflicts).

## Verification

- `curl https://nailismo.com/feed/google.xml` → valid XML, every `g:link` 200.
- Run feed through GMC feed validator.
- After GMC refetch: landing-page disapproval clears in Diagnostics.

## Out of scope

- `/products/`→`/product/` redirect (Option B). Cheap, worth doing later for stray
  links, but not part of this work — and it cannot fix the `myshopify.com` domain
  links anyway.
- Per-variant / size-level feed items.
- Cursor pagination beyond 250 products.
