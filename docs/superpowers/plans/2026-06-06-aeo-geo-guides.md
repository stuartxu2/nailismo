# AEO/GEO Editorial Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish 4 evergreen press-on guides to the Shopify `journal` blog and emit HowTo + FAQPage JSON-LD for them so AI answer engines can extract and cite the content.

**Architecture:** Guide prose lives in Shopify (renders via existing `/journal/[handle]` route). Structured schema data (HowTo steps, FAQ) lives in a code-side registry keyed by article handle; the journal route looks the handle up and emits the extra JSON-LD alongside the existing BlogPosting. An idempotent Python tool publishes the articles + images via the Admin API.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Vitest, Shopify Admin GraphQL API, Python 3.11 (`tools/`).

---

## Context the engineer needs

- Repo is a pnpm + Turborepo monorepo. Web app at `apps/web`. Build: `pnpm --filter web build`. Test: `pnpm --filter web test` (Vitest, `vitest run`).
- **This is a modified Next.js 16.2.6** (`apps/web/AGENTS.md`): consult `apps/web/node_modules/next/dist/docs/` before touching route/metadata APIs; don't assume from memory.
- The journal route `apps/web/app/journal/[handle]/page.tsx` already builds a `BlogPosting` JSON-LD object (`articleSchema`) and renders it via `<script type="application/ld+json">`. We add to that, not replace it.
- Shopify Admin auth: `tools/shopify_auth.py` exposes `load_env()` and `get_admin_token(env)` (client-credentials grant; token cached in `.tmp/`). `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_API_VERSION` come from env. Pattern reference: `tools/shopify_upload_product.py`.
- Target blog: handle `journal`, id `gid://shopify/Blog/81033429041` (empty).
- Guide images: repo assets are AVIF; Shopify article images reject AVIF → convert to webp first (`sips -s format webp`).
- **Reality check:** Google no longer renders HowTo/FAQ rich results. We emit them for AEO/GEO (machine extraction by AI engines), not SERP snippets. "Valid parse" is the success bar, not "rich result shown."

## File Structure

- **Create** `apps/web/app/journal/guideSchema.ts` — typed registry (handle → HowTo steps + FAQ) + `buildGuideJsonLd()` emitter. One responsibility: turn a known guide handle into extra JSON-LD objects.
- **Create** `apps/web/app/journal/guideSchema.test.ts` — Vitest unit tests for the emitter.
- **Modify** `apps/web/app/journal/[handle]/page.tsx` — call `buildGuideJsonLd()` and render the returned scripts.
- **Create** `tools/guides/*.html` (4 files) — guide bodies (Shopify `contentHtml`).
- **Create** `tools/shopify_publish_guides.py` — idempotent publisher (article create/update + webp image upload).

---

## Task 1: Guide schema registry + emitter (TDD)

**Files:**
- Create: `apps/web/app/journal/guideSchema.ts`
- Test: `apps/web/app/journal/guideSchema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/app/journal/guideSchema.test.ts
import { describe, it, expect } from "vitest";
import { buildGuideJsonLd } from "./guideSchema";

const URL = "https://nailismo.com/journal/how-to-apply-press-on-nails";

describe("buildGuideJsonLd", () => {
  it("returns [] for an unknown handle", () => {
    expect(buildGuideJsonLd("not-a-guide", "x", URL)).toEqual([]);
  });

  it("emits HowTo + FAQPage for a how-to guide", () => {
    const out = buildGuideJsonLd("how-to-apply-press-on-nails", "How to Apply", URL);
    const types = out.map((o) => (o as { "@type": string })["@type"]);
    expect(types).toContain("HowTo");
    expect(types).toContain("FAQPage");
    const howTo = out.find((o) => (o as { "@type": string })["@type"] === "HowTo") as {
      step: unknown[];
    };
    expect(howTo.step.length).toBeGreaterThanOrEqual(3);
  });

  it("emits only FAQPage for the comparison guide (no HowTo)", () => {
    const out = buildGuideJsonLd("press-ons-vs-gel-vs-acrylic", "Compare", URL);
    const types = out.map((o) => (o as { "@type": string })["@type"]);
    expect(types).toEqual(["FAQPage"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run app/journal/guideSchema.test.ts`
Expected: FAIL — cannot import `buildGuideJsonLd` (module not found).

- [ ] **Step 3: Write the registry + emitter**

```ts
// apps/web/app/journal/guideSchema.ts
//
// Structured-data registry for the evergreen guides. Prose for each guide lives
// in Shopify (rendered by /journal/[handle]); the HowTo steps + FAQ below drive
// the HowTo/FAQPage JSON-LD for AI answer engines.
//
// COUPLING: this data is authored in tandem with the Shopify article body. If a
// guide's steps or FAQ change in Shopify, update the matching entry here too —
// the schema does NOT read from Shopify.

export type HowToStep = { name: string; text: string };
export type FaqItem = { q: string; a: string };
export type GuideSchemaData = { howToSteps?: HowToStep[]; faq: FaqItem[] };

export const GUIDE_SCHEMA: Record<string, GuideSchemaData> = {
  "how-to-apply-press-on-nails": {
    howToSteps: [
      { name: "Prep your nails", text: "Wash your hands, push back the cuticles, and lightly buff the nail surface. Wipe each nail with an alcohol pad so the adhesive grips." },
      { name: "Size every nail first", text: "Match a press-on to each nail before you stick anything. Pick the size that covers the nail bed sidewall to sidewall without pressing into the skin." },
      { name: "Apply the adhesive", text: "For up to 7 days, use the liquid glue: a thin layer on your nail and a dot on the press-on. For a single night, use a sizing tab instead." },
      { name: "Press and hold", text: "Line the press-on up at your cuticle, press down from base to tip, and hold firm for 10 seconds to push out air bubbles." },
      { name: "Set and shape", text: "Wait 10 minutes before anything wet, then file the tips to your length. Done." },
    ],
    faq: [
      { q: "How long do press-ons last with glue?", a: "With liquid adhesive and clean prep, up to 7 days. Tabs are best for one-night wear." },
      { q: "Can I shower with press-ons on?", a: "Yes, once the glue has set for about 10 minutes. Avoid long hot soaks, which loosen adhesive faster." },
      { q: "Why do my press-ons pop off early?", a: "Almost always skipped prep — oily nails or no buffing. Wipe with alcohol and buff first." },
    ],
  },
  "press-on-nail-sizing-guide": {
    howToSteps: [
      { name: "Match each nail", text: "Lay each press-on against the matching nail and find the one that spans your nail edge to edge without digging into the skin." },
      { name: "Size up when between", text: "If you're between two sizes, go larger. A slightly big press-on can be filed down; a small one lifts at the edges." },
      { name: "Record your size map", text: "Write down the size per finger. Hands are rarely one uniform size, and your map stays the same across every set." },
      { name: "Or use the fit tool", text: "Use the Find My Size tool to map your exact fit in about a minute if you'd rather not eyeball it." },
    ],
    faq: [
      { q: "How do I measure press-on nail size?", a: "Match each press-on to the nail and pick the one covering edge to edge, or use our Find My Size tool." },
      { q: "What if I'm between sizes?", a: "Size up. Filing a large nail down is easy; a small one peels at the edges." },
      { q: "Are both hands the same size?", a: "Usually no. Size each finger individually and save your map." },
    ],
  },
  "how-to-remove-press-on-nails": {
    howToSteps: [
      { name: "Soak first", text: "Soak fingertips in warm soapy water for 10–15 minutes, or wrap each nail in an acetone-soaked cotton pad for a few minutes." },
      { name: "Loosen the edge", text: "Gently wiggle a wooden cuticle stick under the edge. If it resists, soak longer — never pry hard." },
      { name: "Lift slowly", text: "Lift each press-on off slowly from the side, not straight up." },
      { name: "Rehydrate", text: "Buff away leftover glue, wash your hands, and apply cuticle oil to rehydrate the nail." },
    ],
    faq: [
      { q: "How do I remove press-ons without damaging my nails?", a: "Soak in warm water or acetone first, then lift gently from the side. Forcing them off is what causes damage." },
      { q: "Can I reuse press-ons after removing them?", a: "Often yes, if you remove gently and clean the glue off the back. Tabs make reuse easiest." },
      { q: "How do I get glue residue off?", a: "Buff lightly or soak in acetone, then oil the nail." },
    ],
  },
  "press-ons-vs-gel-vs-acrylic": {
    // Comparison guide — no procedural steps, FAQ only.
    faq: [
      { q: "Are press-ons better than gel or acrylic?", a: "For cost, speed, and zero nail damage, yes. Gel and acrylic last longer but need a salon and file down your natural nail." },
      { q: "Do press-ons damage your nails like acrylic?", a: "No. There's no drilling or hard filing — they lift off after a soak." },
      { q: "How long do press-ons last vs acrylic?", a: "Press-ons last up to 7 days; acrylic 2–3 weeks. Press-ons trade longevity for no damage and no salon visit." },
      { q: "Are press-ons cheaper than a salon?", a: "Far cheaper — one reusable set versus a recurring salon bill." },
    ],
  },
};

export function buildGuideJsonLd(
  handle: string,
  title: string,
  url: string,
  imageUrl?: string,
): object[] {
  const data = GUIDE_SCHEMA[handle];
  if (!data) return [];
  const out: object[] = [];

  if (data.howToSteps?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: title,
      ...(imageUrl ? { image: [imageUrl] } : {}),
      step: data.howToSteps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.name,
        text: s.text,
        url: `${url}#step-${i + 1}`,
      })),
    });
  }

  out.push({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run app/journal/guideSchema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/journal/guideSchema.ts apps/web/app/journal/guideSchema.test.ts
git commit -m "feat(web): guide HowTo/FAQ JSON-LD registry + emitter"
```

---

## Task 2: Emit guide schema from the journal route

**Files:**
- Modify: `apps/web/app/journal/[handle]/page.tsx`

- [ ] **Step 1: Import the emitter**

Add to the import block at the top of the file:

```ts
import { buildGuideJsonLd } from "@/app/journal/guideSchema";
```

- [ ] **Step 2: Build the guide JSON-LD next to the existing `articleSchema`**

Immediately after the `const articleSchema = { ... };` object (the BlogPosting one), add:

```ts
  const guideJsonLd = buildGuideJsonLd(
    article.handle,
    article.title,
    `${siteUrl}/journal/${article.handle}`,
    article.image?.url,
  );
```

(`siteUrl` is already defined just above `articleSchema` in this function.)

- [ ] **Step 3: Render the guide scripts after the existing BlogPosting script**

Find the existing render of the article schema:

```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
```

Add directly below it:

```tsx
      {guideJsonLd.map((schema, i) => (
        <script
          key={`guide-ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
```

- [ ] **Step 4: Verify build + types**

Run: `pnpm --filter web build`
Expected: "✓ Compiled successfully", no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/journal/[handle]/page.tsx
git commit -m "feat(web): emit HowTo/FAQPage JSON-LD on guide journal posts"
```

---

## Task 3: Author the 4 guide bodies (content)

**Files:**
- Create: `tools/guides/how-to-apply-press-on-nails.html`
- Create: `tools/guides/press-on-nail-sizing-guide.html`
- Create: `tools/guides/press-ons-vs-gel-vs-acrylic.html`
- Create: `tools/guides/how-to-remove-press-on-nails.html`

> Content task, not TDD. Each file is the Shopify `contentHtml` body. The prose must
> stay factually consistent with the registry data authored in Task 1 (same steps, same
> FAQ answers). Review gate: these are shown to the user before publishing in Task 5.

- [ ] **Step 1: Write each guide body** following this required structure (≈800–1500 words each):
  - Opening `<p>` that **directly answers the title in 1–2 sentences** (the AI-extractable snippet).
  - Semantic `<h2>`/`<h3>` sections.
  - How-to guides (apply, sizing, removal): a numbered `<ol>` whose `<li>` items match the registry `howToSteps` (same order, same substance). Wrap each in an `id="step-N"` anchor target where practical.
  - Comparison guide: an HTML `<table>` comparing press-ons / gel / acrylic across cost, wear time, nail damage, application time, reusability.
  - Closing `<h2>FAQ</h2>` with the registry `faq` items rendered as `<h3>` question + `<p>` answer.
  - 2–4 contextual internal links using **relative** hrefs: `/fit`, `/shop`, relevant `/product/{handle}` or `/collections/{handle}`, and at least one cross-link to a sibling guide `/journal/{handle}`.
  - Brand voice: fun, unisex, Gen-Z candy, genuinely useful. Match `apps/web/app/about/page.tsx` tone.

- [ ] **Step 2: Sanity-check links** — confirm each linked product/collection handle exists (cross-reference with `mcp__claude_ai_Shopify__search_products` / live `/shop`). No invented handles.

- [ ] **Step 3: Commit**

```bash
git add tools/guides/
git commit -m "content: 4 AEO/GEO press-on guides (bodies)"
```

---

## Task 4: Publisher tool (image upload + idempotent article create/update)

**Files:**
- Create: `tools/shopify_publish_guides.py`

> Mirrors `tools/shopify_upload_product.py` patterns. Uses `tools/shopify_auth.py`
> (`load_env`, `get_admin_token`). Must be idempotent (CLAUDE.md): look up the article by
> handle and `articleUpdate` if it exists, else `articleCreate`. No secrets printed.

- [ ] **Step 1: Write the tool** with this behavior:
  - `load_env()` + `get_admin_token(env)`; build Admin GraphQL endpoint
    `https://{SHOPIFY_STORE_DOMAIN}/admin/api/{SHOPIFY_API_VERSION}/graphql.json` with header
    `X-Shopify-Access-Token`.
  - A `GUIDES` list of dicts: `{handle, title, body_file, tags, excerpt, image_src(avif path), image_alt}`.
    - `how-to-apply-press-on-nails` → tags `["guide","howto","application"]`
    - `press-on-nail-sizing-guide` → tags `["guide","howto","sizing"]`
    - `how-to-remove-press-on-nails` → tags `["guide","howto","removal"]`
    - `press-ons-vs-gel-vs-acrylic` → tags `["guide","comparison"]`
  - **Image step:** for each guide, `sips -s format webp --out .tmp/<handle>.webp <avif>` to convert; stage-upload to Shopify Files via `stagedUploadsCreate` → PUT bytes → `fileCreate` (or pass the resulting resource URL as the article `image: { url }`). If conversion/upload fails, log and publish the article without an image (non-fatal).
  - **Idempotency:** query `blogByHandle(handle:"journal"){ articleByHandle(handle:$h){ id } }` (or list articles + match handle). If found → `articleUpdate(id, article:{...})`; else → `articleCreate(article:{ blogId:"gid://shopify/Blog/81033429041", handle, title, body, tags, image })`. Read `body` from `tools/guides/<handle>.html`.
  - Set the article `isPublished: true` / `publishDate` so it appears at `/journal`.
  - Structured stdout: per guide print `handle`, action (`created`/`updated`), resulting `id`, and image status. On `userErrors`, print them and exit non-zero. Never print token/env values.
  - Guard with `if __name__ == "__main__":` and a `--dry-run` flag that prints the planned action per guide without mutating.

- [ ] **Step 2: Validate the GraphQL** — before running live, confirm `articleCreate`/`articleUpdate`/`stagedUploadsCreate` input shapes with `mcp__claude_ai_Shopify__graphql_schema` (don't guess field names; the Admin API version is in env).

- [ ] **Step 3: Dry-run**

Run: `python3 tools/shopify_publish_guides.py --dry-run`
Expected: prints 4 planned actions (all `create`), no mutations, exit 0.

- [ ] **Step 4: Commit**

```bash
git add tools/shopify_publish_guides.py
git commit -m "tools: idempotent guide publisher (article + webp image upload)"
```

---

## Task 5: Publish (production mutation — user gate) + verify

**Files:** none (operational)

- [ ] **Step 1: User review of guide bodies** — show the 4 `tools/guides/*.html` drafts to the user. Get explicit approval before any production write (CLAUDE.md: ask before mutating production data).

- [ ] **Step 2: Publish**

Run: `python3 tools/shopify_publish_guides.py`
Expected: 4 articles `created`, image status per guide, exit 0.

- [ ] **Step 3: Re-run to prove idempotency**

Run: `python3 tools/shopify_publish_guides.py`
Expected: 4 articles `updated` (not duplicated), exit 0.

- [ ] **Step 4: Verify rendering** — start the web app and load the pages:

```bash
cd apps/web && pnpm exec next start -p 3210 &
sleep 6
curl -s localhost:3210/journal | grep -c 'candy-card'        # 4 guide cards present
curl -s localhost:3210/journal/how-to-apply-press-on-nails | grep -o '"@type":"[A-Za-z]*"' | sort -u
# Expect: BlogPosting, HowTo, FAQPage, Question, Answer, HowToStep, Organization, WebSite ...
curl -s localhost:3210/journal/press-ons-vs-gel-vs-acrylic | grep -o '"@type":"HowTo"'  # expect EMPTY
pkill -f "next start -p 3210"
```

Expected: how-to guide shows HowTo + FAQPage; comparison guide shows FAQPage but **no** HowTo.

- [ ] **Step 5: External schema validation** — after deploy to a preview/prod URL, run Google Rich Results Test on each guide URL. Bar = **valid parse, zero errors** (rich-result display not expected; see reality check).

- [ ] **Step 6: Internal-link check** — click through each guide's links; no 404s; sibling cross-links resolve.

---

## Self-Review notes

- **Spec coverage:** content home/routing (Task 2,3,5), 4 guides (Task 3), HowTo+FAQ schema via registry (Task 1,2), images webp+upload (Task 4), idempotent publishing tool + prod gate (Task 4,5), verification (Task 5). All spec sections mapped.
- **Registry/route type consistency:** `buildGuideJsonLd(handle, title, url, imageUrl?)` defined in Task 1, called with exactly those args in Task 2. `GUIDE_SCHEMA` handles match the 4 article handles used in Tasks 3–5.
- **Coupling risk documented** in `guideSchema.ts` header comment (registry must track Shopify edits).
