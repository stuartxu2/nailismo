# Workflow: Catalog Color Tagging

> Apply real-color tags to nail-set products and keep one automated Shopify
> collection per color. Repeatable for every new product drop.

## Purpose

The storefront `/shop` filter and the homepage "Shop by color" section are driven
by product **tags**. Each nail set carries one or more real-color tags
(`Black`, `White`, `Silver`, `Gold`, `Red`, `Blue`, `Green`, `Grey`, `Brown`).
Automated collections (handle = lowercase color) auto-include any product holding
that tag — no manual collection membership upkeep.

Tags are **real colors**, verified by inspecting product imagery — never guessed
from the product name. Names like "Midnight Circuit" or "Molten Steel" do not
reliably encode color.

## Prerequisites

- `SHOPIFY_ADMIN_API_TOKEN` set in `apps/web/.env.local` with scope `write_products`.
- `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_API_VERSION` present in the same file.
- Python 3.11+ (stdlib only — no pip install needed).

## Tool

`tools/shopify_color_tags.py` — idempotent. Dry-run by default, `--apply` to write.
The verified handle→colors map and per-product tag cleanups live in `COLOR_MAP`
and `STRIP_TAGS` at the top of that file.

## Steps

1. **Inspect imagery for any new/changed product.**
   - Pull featured images and view them. Assign 1–3 colors, **dominant first**.
   - Tag policy: dominant color first, then notable accents. Skip trace accents
     that don't define the set.
   - Add the new `handle: [colors]` entries to `COLOR_MAP`. Add any bad-tag
     cleanups to `STRIP_TAGS`.
   - **verify:** every new nail set has at least one color tag; only nail sets are
     listed (exclude Gift Card, Nail Glue, Glue Remover, and other non-sets).

2. **Dry-run.**
   ```bash
   python tools/shopify_color_tags.py
   ```
   - **verify:** output lists the intended `+`/`-` tag changes and any collections
     to create. No errors. Nothing is written.

3. **Get sign-off**, then apply.
   ```bash
   python tools/shopify_color_tags.py --apply
   ```
   - **verify:** no `userErrors` in output. Re-running prints all `=` (up to date),
     confirming idempotency.

4. **Spot-check in Shopify Admin.**
   - Products → confirm color tags on 2–3 sets.
   - Collections → each color collection exists and auto-lists the right products.
   - **verify:** `Silver` is the largest (chrome trend); `Grey`/`Brown` may have a
     single product — that is expected and truthful.

## Color taxonomy (current)

| Color  | Notes |
|--------|-------|
| Black  | glossy/matte black base |
| White  | white / clear-milky base |
| Silver | chrome, silver glitter, foil — most common |
| Gold   | gold glitter or gold accent-dominant |
| Red    | red / crimson / burgundy / maroon |
| Blue   | navy, royal, icy, slate-blue |
| Green  | olive, forest, mint, jade |
| Grey   | matte/gloss grey (distinct from Silver) |
| Brown  | brown / amber / earth-tone |
| Nude   | secondary accent only — no standalone collection |

## Constraints & gotchas

- Storefront `Collection` type has **no** `productsCount` field — count via the
  Admin API or the dashboard if needed.
- Admin GraphQL endpoint is `/admin/api/<version>/graphql.json` with header
  `X-Shopify-Access-Token`; the Storefront endpoint and token are different.
- Automated collections use `ruleSet.rules: [{column: TAG, relation: EQUALS,
  condition: "<Color>"}]` with `appliedDisjunctively: false`.
- **New collections are invisible to the Storefront API until published** to the
  storefront sales channels. The tool now auto-publishes each created collection to
  every publication whose name contains "Online Store" or "Headless"
  (`publishablePublish`). After publishing, allow a short propagation delay
  (seconds to a couple minutes) before `collection(handle:)` resolves via the
  public Storefront token — poll, don't assume failure.
- Storefront field: use `collection(handle:)`; the legacy `collectionByHandle`
  can return null on the current API version even when the collection exists.
- Tag values are **case-sensitive** in the collection rule — keep `COLOR_MAP`
  values and `COLLECTION_COLORS` capitalization identical.
- Never log token values. Surface only the key *name* when one is missing.

## Related / follow-ups

- Wiring the homepage "Shop by color" blobs (`apps/web/app/candy/CandyHome.tsx`)
  to these collections (`/collections/<color>`) is a separate frontend task.
