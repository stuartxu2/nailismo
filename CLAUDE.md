# CLAUDE.md

> Top-level agent contract for the **Nailismo.com** monorepo.
> Read this file first. It links out to `FRONTDESIGN.md` and `WAT_CLAUDE.md`, which are co-equal authorities for their domains.

---

## Project Overview

**Nailismo** is a headless e-commerce platform (web + mobile) for nail-related products. The storefront is built on top of **Shopify** (catalog, inventory, checkout, customer accounts, orders) and consumed by two clients:

- **Web** — Next.js 15+ App Router, deployed on **Vercel Edge Network**.
- **Mobile** — Expo / React Native, shipped to iOS & Android via EAS.

Both clients share the same Shopify Storefront GraphQL schema and the same design tokens from `brand_assets/`.

The project is orchestrated under the **WAT framework** (Workflows, Agents, Tools): probabilistic reasoning lives in the agent layer, deterministic execution lives in `tools/`, and intent is captured as Markdown SOPs in `workflows/`. See `WAT_CLAUDE.md` for the full rules.

---

## Tech Stack

**Web (`apps/web`)**
- Next.js 15+ (App Router, React Server Components, Server Actions)
- TypeScript (`strict: true`)
- Tailwind CSS (CDN in early prototyping per FRONTDESIGN.md, PostCSS pipeline in production)
- Shopify Storefront API (GraphQL) via a typed client (`@shopify/hydrogen-react` or codegen'd SDK)
- Vercel (hosting, ISR, on-demand revalidation, Edge Functions, Image Optimization)

**Mobile (`apps/app`)**
- Expo SDK (latest stable) + Expo Router (file-based routing)
- React Native + TypeScript
- Shared Storefront GraphQL layer with the web app
- EAS Build & EAS Submit for releases; EAS Update for OTA JS patches

**Backend**
- **Shopify (headless)** — single source of truth for products, prices, inventory, customers, orders
- **Storefront API** — read paths and checkout creation (public-scoped tokens, cached aggressively)
- **Admin API** — server-side only, invoked from `tools/` or trusted route handlers, never bundled into clients
- **Vercel serverless / edge functions** — webhook receivers and lightweight BFF logic

**Tooling**
- pnpm workspaces + Turborepo (monorepo build orchestration)
- Python 3.11+ for operational scripts in `tools/`
- Puppeteer for the FRONTDESIGN.md screenshot QA loop
- ESLint, Prettier, TypeScript, Vitest, Playwright

---

## Architecture

**Core principle (from WAT):** if a deterministic script can do it, the agent should not. Agents orchestrate; tools execute.

```
                ┌──────────────────────────────┐
                │           Shopify            │
                │  (catalog, checkout, orders) │
                └──────────────┬───────────────┘
                               │ GraphQL
              ┌────────────────┴────────────────┐
              │                                 │
   ┌──────────▼──────────┐           ┌──────────▼──────────┐
   │    apps/web         │           │    apps/app         │
   │  Next.js / Vercel   │           │  Expo / RN          │
   └──────────┬──────────┘           └─────────────────────┘
              │
              │ (webhook callbacks, BFF)
              ▼
   ┌─────────────────────┐
   │   tools/  scripts   │  ← invoked per workflows/*.md SOPs
   └─────────────────────┘
```

- **Web is server-first.** Product pages and collection pages use RSC + ISR. Only cart, account, and other user-specific UI become client components.
- **Checkout always redirects to Shopify-hosted checkout.** PCI scope stays with Shopify. No custom payment flow.
- **GraphQL types are generated once** and imported by both `apps/web` and `apps/app` (shared `packages/` workspace).
- **Long-running, scheduled, or batch work** (catalog sync, sitemap generation, price audits, content migrations) lives in `tools/` and is invoked via a matching `workflows/*.md` SOP.

---

## Coding Standards

**`WAT_CLAUDE.md` is the source of truth for how to operate.** Read it before doing anything non-trivial. The points below are project-specific reinforcements, not replacements.

- **Look for existing tools first.** Before scripting anything new, scan `tools/` for an existing utility.
- **Workflow before action.** For any multi-step task (catalog sync, deploy, content migration, schema change), read or draft the matching `workflows/*.md` SOP before executing.
- **Don't create or overwrite workflows without explicit user approval.** Workflows are durable instructions, not scratch space.
- **Self-improvement loop is mandatory.** When a tool fails: fix it, verify, then update the workflow so the same failure doesn't recur. Document constraints you discover (rate limits, API quirks, timing).
- **Never store secrets outside `.env`.** Shopify tokens, Vercel tokens, EAS tokens — all in `.env`, gitignored. Never log or print values; surface key *names* only when something is missing.
- **Language conventions**
  - TypeScript everywhere in `apps/`. No `any` without a comment justifying it. No `// @ts-ignore` without a linked issue.
  - Python in `tools/` uses type hints + `ruff` lint + `pytest` for any non-trivial logic.
- **Naming**
  - `kebab-case` for files in `apps/`
  - `snake_case` for Python modules in `tools/`
  - `PascalCase` for React components and TS types
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`).
- **No silent failures.** Every tool logs structured output to stdout; errors include enough context (request ID, input slice, retry count) to diagnose without re-running.
- **Idempotency.** Scripts in `tools/` must be safe to re-run. Use checksums, ETags, or timestamps to avoid duplicate writes against Shopify.
- **Ask before spending.** If a task will consume paid API credits, mutate production data, or trigger a deploy, confirm with the user first.

---

## Repository Structure

```
nailismo/
├── .tmp/                     # Disposable processing buffers & Puppeteer outputs
├── tools/                    # Deterministic execution scripts (Python/Node)
├── workflows/                # Markdown SOPs mapping operational protocols
├── brand_assets/             # Curated logos, precise color definitions, and type specs
├── apps/
│   ├── web/                  # Next.js 15+ (App Router) - Hosted on Vercel Edge Network
│   └── app/                  # Expo / React Native - Native iOS & Android Framework
├── packages/                 # Shared code (GraphQL types, UI primitives, design tokens)
├── serve.mjs                 # Root development local server execution manager
├── screenshot.mjs            # Puppeteer screenshot capture (per FRONTDESIGN.md)
├── temporary screenshots/    # Auto-incremented screenshot output (gitignored)
├── pnpm-workspace.yaml       # Monorepo workspace config
├── turbo.json                # Turborepo pipeline
├── CLAUDE.md                 # This file — top-level agent instructions
├── FRONTDESIGN.md            # Frontend rules (always invoke frontend-design skill)
├── WAT_CLAUDE.md             # WAT framework rules
└── .env                      # Universal environment variables & Shopify Storefront keys
```

**Path rules**
- `.tmp/` and `temporary screenshots/` are always disposable. Never commit. Never reference as canonical.
- **Deliverables go to cloud, not local files.** Anything the user needs to actually use lives in Shopify admin, Vercel preview URLs, or shared docs — local artifacts are processing intermediates only.
- `brand_assets/` is the **only** source of truth for logos and color values. Never invent or approximate brand colors.

---

## Frontend Guidelines

**Always refer to `FRONTDESIGN.md` first.** Before writing any frontend code, in every session, invoke the `frontend-design` skill. No exceptions.

Project-specific reinforcements on top of FRONTDESIGN.md:

- **Screenshot loop is mandatory and minimum 2 rounds.** Build → `node serve.mjs` → `node screenshot.mjs http://localhost:3000` → read the PNG → compare against reference → fix → repeat.
- **Reference images are law.** Match exactly. Do not "improve" a reference design.
- **Anti-generic guardrails** (from FRONTDESIGN.md) apply to every component:
  - No default Tailwind blue/indigo as primary.
  - No `transition-all`. Animate only `transform` and `opacity`.
  - No flat `shadow-md`; use layered, color-tinted shadows.
  - Pair a display/serif heading font with a clean sans body font.
  - Every interactive element ships with hover, focus-visible, **and** active states.
- **Brand assets override placeholders.** Check `brand_assets/` before reaching for `placehold.co`.

**Web-specific**
- Prefer RSC for product / collection / marketing pages (SEO, TTFB).
- Use `next/image` with Shopify CDN URLs. Never ship raw merchant uploads.
- Critical CSS inlined; defer non-critical scripts.
- Lighthouse target: ≥95 Performance, ≥95 Accessibility, =100 SEO on PDPs.

**Mobile-specific**
- Mirror the web design language using the same tokens from `brand_assets/`.
- Respect native platform gestures, safe areas, and Dynamic Type.
- Use Reanimated 3 for animation. Avoid the legacy `Animated` API.

---

## Backend & Shopify Integration

- **Read paths** — Storefront API only, called from RSC or server actions. Public-scoped tokens, but always cache (route segment caching on the web, in-memory cache on the mobile client).
- **Write paths** — anything mutating (drafts, orders, customers, metafields) goes through server-side handlers or `tools/`. Admin API tokens are **never** bundled into clients.
- **Webhooks** — Shopify webhooks land in `apps/web/app/api/webhooks/*` and **must** verify the HMAC signature before doing any work. Treat the body as untrusted until verified.
- **Schema & types** — run a codegen step (Shopify Storefront schema → TS types) into `packages/shopify-types`. Both apps import from there.
- **Checkout** — always redirect to Shopify-hosted checkout. No custom payment flow.
- **Catalog edits** are managed in Shopify Admin, not in code. Tools in `tools/` may *sync* or *audit* the catalog, but the Shopify dashboard remains the editorial surface.

---

## Environment Variables

All keys live in `.env` at the repo root and are loaded per-app via `dotenv` or the framework's native convention. Minimum required:

```
# Shopify
SHOPIFY_STORE_DOMAIN=
SHOPIFY_STOREFRONT_API_TOKEN=          # public-scoped, OK on the client
SHOPIFY_ADMIN_API_TOKEN=               # server-side only — never bundle
SHOPIFY_API_VERSION=

# Vercel
VERCEL_TOKEN=                          # for tools/ that call the Vercel API

# Site
NEXT_PUBLIC_SITE_URL=

# Expo / EAS
EXPO_TOKEN=
```

**Never** log, print, or commit values from `.env`. If a tool needs to flag that a key is missing, surface the key *name* only.

---

## Deployment

- **Web** — Vercel, connected to `main` for production and PRs for preview deployments. ISR + on-demand revalidation for PDPs / PLPs. Production deploys must reference a `workflows/deploy_web.md` SOP.
- **Mobile** — EAS Build for both platforms; EAS Update for OTA JS patches. Native binary releases go through a `workflows/release_mobile.md` SOP.
- **Tools** — run locally or via scheduled GitHub Actions. Never deployed as a long-running service.
- **Never deploy from local CLI without a corresponding workflow entry.**

---

## Performance / SEO / Accessibility Budgets

- **LCP** ≤ 2.0s on 4G for PDPs and PLPs.
- **CLS** ≤ 0.05.
- **Bundle** — route-level JS ≤ 90 KB gzipped for marketing routes.
- **Images** — always via `next/image` or Expo Image, with explicit width/height. Shopify CDN params for sizing/format.
- **SEO** — structured data (`Product`, `Offer`, `BreadcrumbList`, `Organization`) on every PDP. Canonical URLs. Sitemap generated by a `tools/` script on release.
- **A11y** — WCAG 2.2 AA minimum. All interactive elements keyboard-reachable with visible focus rings. Don't remove default focus rings without a designed replacement.

---

## Testing

- **Unit** — Vitest for shared logic. Co-located `*.test.ts` files.
- **Component** — React Testing Library for non-trivial UI components.
- **E2E** — Playwright against a Vercel preview URL for the critical purchase path: browse → PDP → add to cart → checkout redirect.
- **Visual** — the screenshot loop in FRONTDESIGN.md is the canonical visual QA pass. No "looks fine to me" without screenshots.
- **Mobile** — Detox or Maestro for the equivalent critical path on iOS + Android.

---

## Document Hierarchy & Conflict Resolution

Three documents form the full agent contract:

1. **`CLAUDE.md`** (this file) — project-wide standards and the glue between the other two.
2. **`WAT_CLAUDE.md`** — how to operate as an agent (workflows, tools, self-improvement loop).
3. **`FRONTDESIGN.md`** — how to build frontend UI (skill invocation, screenshot loop, anti-generic guardrails).

If two of these conflict, **stop and raise it with the user before acting.** Don't choose silently. Update the documents only with explicit approval.

---

## When You're Stuck

In priority order:

1. Re-read the relevant workflow in `workflows/`.
2. Check `tools/` for an existing solution.
3. Read the Shopify Storefront API docs for the specific resource.
4. Ask the user before consuming paid API quota, mutating production data, or overwriting a workflow.

Stay pragmatic. Stay reliable. Keep improving the system.