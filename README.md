# nailismo

Headless e-commerce for press-on manicures designed for men's hands. Shopify backend + Next.js web client.

## Repo layout

- `apps/web/` — Next.js 16 App Router storefront (Vercel-bound, Tailwind v4, RSC-first).
- `brand_assets/` — logos, fonts, color refs. Source of truth for brand identity.
- `listing_v1/`, `website_images/` — original product and editorial imagery.
- `index.html` — original static homepage prototype. Kept until Next.js parity is signed off.
- `serve.mjs` — static server for `index.html` on port 3000.
- `screenshot.mjs` — Puppeteer QA loop (per `FRONTDESIGN.md`).
- `CLAUDE.md`, `FRONTDESIGN.md`, `WAT_CLAUDE.md` — agent contracts.

## apps/web — local dev

```sh
cd apps/web
cp .env.local.example .env.local   # then fill in SHOPIFY_* values
pnpm install                       # only if node_modules missing
pnpm dev                           # http://localhost:3000
```

Required env vars (in `apps/web/.env.local`, never committed):

- `SHOPIFY_STORE_DOMAIN` — e.g. `your-shop.myshopify.com`
- `SHOPIFY_STOREFRONT_API_TOKEN` — public-scoped Storefront token
- `SHOPIFY_API_VERSION` — defaults to `2025-01`
- `NEXT_PUBLIC_SITE_URL` — canonical site origin

Other commands:

```sh
pnpm build         # production build + type-check
pnpm lint          # ESLint
pnpm exec tsc --noEmit   # type-check only
```

## Visual parity QA

While both servers run (`node serve.mjs` for the original `index.html`, `pnpm dev` for Next.js), capture screenshots and compare:

```sh
node screenshot.mjs http://localhost:3000 original
node screenshot.mjs http://localhost:3001 next     # Next picks 3001 when 3000 taken
```

Output lands in `temporary screenshots/` (gitignored).
