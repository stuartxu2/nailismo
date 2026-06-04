# Workflow: Sync new press-on designs + collections

Add press-on designs that aren't in the catalog yet from a local Listing image
folder, then build the Gen-Z collections and surface them on the storefront.

**Tool:** `tools/shopify_new_products.py` (idempotent, dry-run by default)
**Auth:** Admin client-credentials grant via `tools/shopify_auth.py`
(keys in `apps/web/.env.local`, scope `write_products` + `write_publications`).

## When to use
- New product photography lands in the Dropbox Listing folder.
- You need to create sized, in-stock, published products + group them into
  collections that the storefront reads.

## Steps

1. **Inventory the gap.** Compare the image folder against the live catalog
   (Shopify MCP `search_products`, vendor `Nailismo*`). Map each image to an
   existing product by its CDN filename; the leftovers are candidates.

2. **Inspect the images.** `Read` each candidate (and dedupe alt shots — files
   ending ` 1` are detail/lifestyle shots of the same design). Decide:
   - title (slang + emoji, gender-neutral; **never** use a real artist/band
     name — the catalog abstracts these, e.g. "rebel rizz" not "G-Dragon"),
   - color tags (dominant first, from the set in `apps/web/lib/product-colors.ts`),
   - price tier: core `$17.99`, premium `$24.99` (3D charms / rhinestones /
     heavy glitter), seasonal `$12.99` (basic holiday). Elaborate seasonal can
     be premium (precedent: snow szn `$24.99`).

3. **Edit the config** in `shopify_new_products.py`:
   `NEW_PRODUCTS` (sized S/M/L/XL), `HALLOWEEN` (Color×Size), `COLLECTIONS`
   (smart by tag, or manual by member handle).

4. **Dry-run, then apply.**
   ```
   python tools/shopify_new_products.py            # plan
   python tools/shopify_new_products.py --apply     # write
   python tools/shopify_new_products.py --only <handle>   # test one
   ```
   Per product the tool: stages+uploads image(s) → `productSet` (tracked
   variants, 10 on hand at the primary location, status ACTIVE) →
   `publishablePublish` to Online Store + Headless. Then creates+publishes the
   collections.

5. **Verify on the storefront API** (not just Admin — the site reads the public
   Storefront token). Query a new handle for `availableForSale` +
   `quantityAvailable`, and a collection for its `products`.

6. **Wire the frontend** if collections are new: `Header.tsx` `NAV`,
   `MobileMenu.tsx` `navLinks`, `Footer.tsx` Shop column. Build (`pnpm build`
   in `apps/web`) to confirm `/collections/[handle]` resolves.

7. **Deploy** per `workflows/deploy_web.md` (merge to `main` = prod; ask first).

## Constraints / gotchas discovered
- The Admin token **lacks `read_locations`** — `locations` only returns `id`
  (name/isActive denied). Single-location store; use the first id.
- New products created via Admin API are **ACTIVE but not auto-published**;
  must `publishablePublish` to the storefront channels or the site can't see them.
- Existing sized products are `tracked: false` (always-available). New ones are
  `tracked: true` with real quantities — don't "fix" the old ones to match.
- Per-color images on a multi-option product: every `variant.file.originalSource`
  must also appear in the product `files` list.
- Color collections (black/white/silver/…) already exist as automated TAG
  collections (`tools/shopify_color_tags.py`) — don't recreate them.
