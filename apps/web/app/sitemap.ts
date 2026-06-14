import type { MetadataRoute } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import {
  PRODUCT_HANDLES_QUERY,
  COLLECTION_HANDLES_QUERY,
  ARTICLE_HANDLES_QUERY,
} from "@/lib/shopify/queries";
import type {
  ProductHandlesQueryResult,
  CollectionHandlesQueryResult,
  ArticleHandlesQueryResult,
} from "@/lib/shopify/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://nailismo.com";

type Entry = { handle: string; lastmod: string };

const STATIC_ROUTES: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFreq: "weekly" },
  { path: "/shop", priority: 0.9, changeFreq: "daily" },
  { path: "/about", priority: 0.6, changeFreq: "monthly" },
  { path: "/contact", priority: 0.5, changeFreq: "yearly" },
  { path: "/lookbook", priority: 0.6, changeFreq: "monthly" },
  { path: "/journal", priority: 0.6, changeFreq: "weekly" },
  { path: "/policies/shipping", priority: 0.4, changeFreq: "yearly" },
  { path: "/policies/returns", priority: 0.4, changeFreq: "yearly" },
  { path: "/policies/privacy", priority: 0.4, changeFreq: "yearly" },
  { path: "/policies/terms", priority: 0.4, changeFreq: "yearly" },
];

async function fetchHandles(): Promise<{ products: Entry[]; collections: Entry[]; articles: Entry[] }> {
  const [products, collections, articles] = await Promise.all([
    storefrontFetch<ProductHandlesQueryResult>(
      PRODUCT_HANDLES_QUERY,
      { first: 100 },
      { revalidate: 3600 },
    ).then((d) => d.products.nodes.map((n) => ({ handle: n.handle, lastmod: n.updatedAt }))).catch((err) => {
      if (!(err instanceof ShopifyConfigError)) console.error("[sitemap] products:", err);
      return [] as Entry[];
    }),
    storefrontFetch<CollectionHandlesQueryResult>(
      COLLECTION_HANDLES_QUERY,
      { first: 50 },
      { revalidate: 3600 },
    ).then((d) => d.collections.nodes.map((n) => ({ handle: n.handle, lastmod: n.updatedAt }))).catch((err) => {
      if (!(err instanceof ShopifyConfigError)) console.error("[sitemap] collections:", err);
      return [] as Entry[];
    }),
    storefrontFetch<ArticleHandlesQueryResult>(
      ARTICLE_HANDLES_QUERY,
      { first: 100 },
      { revalidate: 3600 },
    ).then((d) => d.articles.nodes.map((n) => ({ handle: n.handle, lastmod: n.publishedAt }))).catch((err) => {
      if (!(err instanceof ShopifyConfigError)) console.error("[sitemap] articles:", err);
      return [] as Entry[];
    }),
  ]);
  return { products, collections, articles };
}

// Shopify timestamps are ISO strings; fall back to build time if missing/invalid.
function lastModified(iso: string, fallback: Date): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const { products, collections, articles } = await fetchHandles();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    // Root canonical is emitted without a trailing slash; keep the sitemap in sync.
    url: r.path === "/" ? SITE : `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE}/products/${p.handle}`,
    lastModified: lastModified(p.lastmod, now),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collectionEntries: MetadataRoute.Sitemap = collections.map((c) => ({
    url: `${SITE}/collections/${c.handle}`,
    lastModified: lastModified(c.lastmod, now),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE}/journal/${a.handle}`,
    lastModified: lastModified(a.lastmod, now),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries, ...collectionEntries, ...articleEntries];
}
