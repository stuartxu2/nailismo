# Workflow: Deploy Web (`apps/web`)

> SOP for shipping the Next.js storefront to Vercel. **Never deploy to production from a local CLI without following this file** (per `CLAUDE.md`). Production tracks `main`; PRs get preview deployments automatically.

## When to use
Any change that should reach production: merged features, content/theme updates, config changes affecting `apps/web`.

## Preconditions (all must pass)
1. Work is on a branch with an open PR into `main` (not committed straight to `main`).
2. `pnpm --filter web build` (or `cd apps/web && npx next build`) is **green** locally.
3. `cd apps/web && npm test` is **green** (Vitest).
4. `cd apps/web && npm run lint` reports **0 errors**.
5. Required env vars exist in the target Vercel environment (see below). Surface only missing **key names**, never values.

## Required environment variables (Vercel → Project → Settings → Environment Variables)
```
SHOPIFY_STORE_DOMAIN
SHOPIFY_STOREFRONT_API_TOKEN
SHOPIFY_API_VERSION
NEXT_PUBLIC_SITE_URL          # canonical origin, used for JSON-LD + sitemap
```
`SHOPIFY_ADMIN_API_TOKEN` is server-only and must **not** be exposed to the client bundle.

## Step 1 — Preview deploy (every PR)
1. Push the branch / open the PR. Vercel posts a **preview URL** on the PR.
2. Verify on the preview URL (not localhost):
   - [ ] Home `/`, `/shop`, a PDP `/product/<handle>`, `/cart`, `/fit`, `/search` render with live Shopify data.
   - [ ] Add-to-cart works and **checkout redirects to Shopify-hosted checkout**.
   - [ ] Fonts (Ekster, Nunito) load; no FOUT/missing-glyph.
   - [ ] Mobile: header drawer, PDP sticky Add-to-Bag bar does not cover the footer.
3. Budgets (run Lighthouse against the preview PDP + PLP):
   - [ ] Performance ≥ 95, Accessibility ≥ 95, SEO = 100
   - [ ] LCP ≤ 2.0s (4G), CLS ≤ 0.05
   - [ ] Route-level JS ≤ 90 KB gzipped on marketing routes
4. Confirm structured data on a PDP via Google Rich Results Test (Product + BreadcrumbList).
5. Run the Playwright E2E critical path against the preview URL (browse → PDP → add → checkout redirect):
   ```
   cd apps/web && npm run e2e:install   # first time only (chromium)
   PLAYWRIGHT_BASE_URL=<preview-url> npm run e2e
   ```

## Step 2 — Merge to `main`
- Only after Step 1 checks pass and the PR is approved.
- Merging triggers the **production** build automatically.

## Step 3 — Verify production
- [ ] Production URL serves the new build (check a PDP + the home hero).
- [ ] `/sitemap.xml` and `/robots.txt` resolve.
- [ ] ISR: PDP/PLP revalidate as expected (current `revalidate` = 300s on shop/home, 120s on PDP).
- [ ] Smoke-test one real add-to-cart → checkout redirect.

## Rollback
- Vercel → Deployments → select the previous good production deployment → **Promote to Production** (instant rollback, no rebuild).
- If a bad commit reached `main`, also `git revert` it so the next deploy is clean.

## Notes / learned constraints
- Storefront API reads are cached (route segment caching); Admin API is server-only.
- Image domains: `cdn.shopify.com` is allow-listed in `next.config.ts` `images.remotePatterns`. Add new external hosts there before referencing them.
- Do not deploy `tools/` as a long-running service; tools run locally or via scheduled CI.
