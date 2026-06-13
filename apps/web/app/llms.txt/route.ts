import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { ARTICLE_HANDLES_QUERY } from "@/lib/shopify/queries";
import type { ArticleHandlesQueryResult } from "@/lib/shopify/types";
import { getMenuCollections } from "@/lib/shopify/collections";

// /llms.txt — a curated, plain-text entry map for AI answer engines
// (ChatGPT, Perplexity, Google AI Overviews, Gemini). Spec: https://llmstxt.org
// We list brand facts + the high-signal guides and menu collections, then point
// to the sitemap for the full catalog rather than enumerating every product.

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://nailismo.com";

export const revalidate = 3600;

const humanize = (handle: string): string =>
  handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function fetchArticleHandles(): Promise<string[]> {
  return storefrontFetch<ArticleHandlesQueryResult>(
    ARTICLE_HANDLES_QUERY,
    { first: 100 },
    { revalidate: 3600 },
  )
    .then((d) => d.articles.nodes.map((n) => n.handle))
    .catch((err) => {
      if (!(err instanceof ShopifyConfigError)) console.error("[llms.txt] articles:", err);
      return [];
    });
}

export async function GET(): Promise<Response> {
  // Reuse the same curated menu collections the site nav uses, so llms.txt
  // mirrors the real information architecture (no color filters / internal sets).
  const [articles, collections] = await Promise.all([fetchArticleHandles(), getMenuCollections()]);

  const guideLines = articles.map((h) => `- [${humanize(h)}](${SITE}/journal/${h})`).join("\n");
  const collectionLines = collections
    .map((c) => `- [${c.title}](${SITE}/collections/${c.handle})`)
    .join("\n");

  const body = `# Nailismo

> Press-on nail sets for every hand — minimalist, statement, and expressive looks built for daily wear, nightlife, and modern style. On in minutes, wears up to 7 days, removes clean. Every set ships with 10 premium nails plus an application toolkit.

## Facts
- Product: reusable press-on nail sets and the glue, remover, and tools to apply them.
- Wear time: up to 7 days per application.
- Application: presses on in minutes; no lamp, no salon.
- In the box: 10 premium nails + toolkit (tabs/glue, prep, file).
- Checkout: hosted by Shopify; ships to the United States.
- Contact: hello@nailismo.com

## Guides
${guideLines || `- [Journal](${SITE}/journal)`}

## Shop
- [Shop all sets](${SITE}/shop)
${collectionLines}

## Full catalog
- [Sitemap](${SITE}/sitemap.xml)

## Company
- [About](${SITE}/about)
- [Shipping](${SITE}/policies/shipping)
- [Returns](${SITE}/policies/returns)
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
