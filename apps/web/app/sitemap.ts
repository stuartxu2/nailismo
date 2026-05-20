import type { MetadataRoute } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import {
  PRODUCT_HANDLES_QUERY,
  COLLECTION_HANDLES_QUERY,
} from "@/lib/shopify/queries";
import type {
  ProductHandlesQueryResult,
  CollectionHandlesQueryResult,
} from "@/lib/shopify/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://nailismo.com";

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

async function fetchHandles(): Promise<{ products: string[]; collections: string[] }> {
  const [products, collections] = await Promise.all([
    storefrontFetch<ProductHandlesQueryResult>(
      PRODUCT_HANDLES_QUERY,
      { first: 100 },
      { revalidate: 3600 },
    ).then((d) => d.products.nodes.map((n) => n.handle)).catch((err) => {
      if (!(err instanceof ShopifyConfigError)) console.error("[sitemap] products:", err);
      return [];
    }),
    storefrontFetch<CollectionHandlesQueryResult>(
      COLLECTION_HANDLES_QUERY,
      { first: 50 },
      { revalidate: 3600 },
    ).then((d) => d.collections.nodes.map((n) => n.handle)).catch((err) => {
      if (!(err instanceof ShopifyConfigError)) console.error("[sitemap] collections:", err);
      return [];
    }),
  ]);
  return { products, collections };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const { products, collections } = await fetchHandles();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((handle) => ({
    url: `${SITE}/product/${handle}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collectionEntries: MetadataRoute.Sitemap = collections.map((handle) => ({
    url: `${SITE}/collections/${handle}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries, ...collectionEntries];
}
