# Graph Report - .  (2026-06-06)

## Corpus Check
- Corpus is ~42,339 words - fits in a single context window. You may not need a graph.

## Summary
- 324 nodes · 555 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.79)
- Token cost: 32,887 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Marketing & Account Pages|Marketing & Account Pages]]
- [[_COMMUNITY_Nail Sizing & Fit Tools|Nail Sizing & Fit Tools]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Sitemap & Policy Pages|Sitemap & Policy Pages]]
- [[_COMMUNITY_Homepage & Newsletter|Homepage & Newsletter]]
- [[_COMMUNITY_Product Detail Page|Product Detail Page]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Product Colors & Catalog|Product Colors & Catalog]]
- [[_COMMUNITY_Journal Guides & Schema|Journal Guides & Schema]]
- [[_COMMUNITY_Cart & Purchase Panel|Cart & Purchase Panel]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Collection Pages|Collection Pages]]
- [[_COMMUNITY_Lookbook Pages|Lookbook Pages]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Social Image Alt Text|Social Image Alt Text]]
- [[_COMMUNITY_Shopify Webhook Handler|Shopify Webhook Handler]]
- [[_COMMUNITY_Agent Contract Docs|Agent Contract Docs]]
- [[_COMMUNITY_README & Deployment|README & Deployment]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Playwright Config|Playwright Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_pnpm Workspace|pnpm Workspace]]

## God Nodes (most connected - your core abstractions)
1. `Header()` - 20 edges
2. `AnnouncementTicker()` - 19 edges
3. `Footer()` - 19 edges
4. `compilerOptions` - 16 edges
5. `storefrontFetch` - 14 edges
6. `scripts` - 8 edges
7. `ArticlePage()` - 6 edges
8. `NotFound()` - 6 edges
9. `cardDots()` - 6 edges
10. `addToCart()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `ArticlePage()` --calls--> `NotFound()`  [INFERRED]
  apps/web/app/journal/[handle]/page.tsx → apps/web/app/not-found.tsx
- `LookPage()` --calls--> `NotFound()`  [INFERRED]
  apps/web/app/lookbook/[handle]/page.tsx → apps/web/app/not-found.tsx
- `PolicyPage()` --calls--> `NotFound()`  [INFERRED]
  apps/web/app/policies/[handle]/page.tsx → apps/web/app/not-found.tsx
- `ProductPage()` --calls--> `NotFound()`  [INFERRED]
  apps/web/app/product/[handle]/page.tsx → apps/web/app/not-found.tsx
- `OpenGraph Image Alt Text` --semantically_similar_to--> `Twitter Image Alt Text`  [INFERRED] [semantically similar]
  apps/web/app/opengraph-image.alt.txt → apps/web/app/twitter-image.alt.txt

## Import Cycles
- 1-file cycle: `apps/web/lib/fit/sizing.ts -> apps/web/lib/fit/sizing.ts`

## Communities (27 total, 6 thin omitted)

### Community 0 - "Marketing & Account Pages"
Cohesion: 0.07
Nodes (32): metadata, PILLARS, SPECS, metadata, CartPage(), formatPrice(), LineRow(), metadata (+24 more)

### Community 1 - "Nail Sizing & Fit Tools"
Cohesion: 0.10
Nodes (21): CalibrationCard(), FingerGeom, GEOM, HandDiagram(), FINGER_LABEL, NailCaliper(), FINGER_LABEL, formatPrice() (+13 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @nailismo/fit-sizing, @nailismo/shopify, @nailismo/theme, next, react, react-dom, @vercel/analytics (+23 more)

### Community 3 - "Sitemap & Policy Pages"
Cohesion: 0.11
Nodes (20): fetchHandles(), sitemap(), STATIC_ROUTES, generateMetadata(), Params, FALLBACK_POLICIES, fetchPolicies(), POLICY_INDEX (+12 more)

### Community 4 - "Homepage & Newsletter"
Cohesion: 0.11
Nodes (19): metadata, CandyHome(), FALLBACK, Flavor, FlavorCard(), getFlavors(), HeroTile(), money() (+11 more)

### Community 5 - "Product Detail Page"
Cohesion: 0.15
Nodes (14): generateMetadata(), Params, SHOTS, UgcStrip(), buildGalleryItems(), fetchProduct(), pickDefaultVariant(), ProductPage() (+6 more)

### Community 6 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Product Colors & Catalog"
Cohesion: 0.17
Nodes (14): cardDots(), COLOR_HEX, ColorDot, colorDots(), SWATCHES, swatchFallback(), buildHref(), collectTags() (+6 more)

### Community 8 - "Journal Guides & Schema"
Cohesion: 0.21
Nodes (11): generateMetadata(), Params, ArticlePage(), fetchArticle(), fetchRelated(), formatDate(), buildGuideJsonLd(), FaqItem (+3 more)

### Community 9 - "Cart & Purchase Panel"
Cohesion: 0.23
Nodes (11): formatPrice(), matchVariant(), PurchasePanel(), TRUST_POINTS, addToCart(), clearCart(), clearCartCookie(), createAndSet() (+3 more)

### Community 10 - "Root Layout & Fonts"
Cohesion: 0.20
Nodes (8): akkuratMono, fredoka, geograph, metadata, nunito, CandyShell(), schema, SiteSchema()

### Community 11 - "Collection Pages"
Cohesion: 0.21
Nodes (8): NotFound(), generateMetadata(), Params, CollectionPage(), fetchCollection(), SearchParams, SORT_OPTIONS, sortProducts()

### Community 12 - "Lookbook Pages"
Cohesion: 0.29
Nodes (6): generateMetadata(), Params, LookPage(), getLook(), Look, LOOKS

### Community 13 - "Vercel Config"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, $schema

### Community 14 - "Social Image Alt Text"
Cohesion: 1.00
Nodes (3): OpenGraph Image Alt Text, Twitter Image Alt Text, Nailismo Brand Tagline (press on, show off)

### Community 16 - "Agent Contract Docs"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules (Breaking Changes Warning), Bundled Next.js Docs (node_modules/next/dist/docs), Web App Agent Contract (CLAUDE.md)

### Community 17 - "README & Deployment"
Cohesion: 0.67
Nodes (3): Geist Font (next/font optimization), Web App README (Next.js create-next-app), Vercel Deployment Platform

## Knowledge Gaps
- **128 isolated node(s):** `metadata`, `PILLARS`, `SPECS`, `metadata`, `Flavor` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Header()` connect `Marketing & Account Pages` to `Nail Sizing & Fit Tools`, `Sitemap & Policy Pages`, `Homepage & Newsletter`, `Product Detail Page`, `Product Colors & Catalog`, `Journal Guides & Schema`, `Collection Pages`, `Lookbook Pages`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `AnnouncementTicker()` connect `Marketing & Account Pages` to `Nail Sizing & Fit Tools`, `Sitemap & Policy Pages`, `Homepage & Newsletter`, `Product Detail Page`, `Product Colors & Catalog`, `Journal Guides & Schema`, `Collection Pages`, `Lookbook Pages`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Footer()` connect `Marketing & Account Pages` to `Nail Sizing & Fit Tools`, `Sitemap & Policy Pages`, `Homepage & Newsletter`, `Product Detail Page`, `Product Colors & Catalog`, `Journal Guides & Schema`, `Collection Pages`, `Lookbook Pages`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `metadata`, `PILLARS`, `SPECS` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Marketing & Account Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06936026936026936 - nodes in this community are weakly interconnected._
- **Should `Nail Sizing & Fit Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.09879032258064516 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._