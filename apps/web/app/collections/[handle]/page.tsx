import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import {
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTION_HANDLES_QUERY,
} from "@/lib/shopify/queries";
import type {
  CollectionByHandleQueryResult,
  CollectionHandlesQueryResult,
  ShopifyCollectionDetail,
} from "@/lib/shopify/types";
import { UgcStrip } from "@/app/components/UgcStrip";
import { CollectionBrowser } from "./CollectionBrowser";

type Params = { handle: string };

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const data = await storefrontFetch<CollectionHandlesQueryResult>(
      COLLECTION_HANDLES_QUERY,
      { first: 50 },
      { revalidate: 300 },
    );
    return data.collections.nodes.map((n) => ({ handle: n.handle }));
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] collection handles failed:", err);
    }
    return [];
  }
}

async function fetchCollection(
  handle: string,
): Promise<ShopifyCollectionDetail | null> {
  try {
    const data = await storefrontFetch<CollectionByHandleQueryResult>(
      COLLECTION_BY_HANDLE_QUERY,
      { handle, first: 50 },
      { revalidate: 300 },
    );
    return data.collection;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error(`[shopify] collection fetch failed for ${handle}:`, err);
    }
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const collection = await fetchCollection(handle);
  if (!collection) return { title: "Collection Not Found · Nailismo" };
  const description =
    collection.description || `Shop the ${collection.title} edit at Nailismo.`;
  return {
    title: `${collection.title} · Nailismo`,
    description: description.slice(0, 160),
    alternates: { canonical: `/collections/${collection.handle}` },
    openGraph: {
      title: `${collection.title} · Nailismo`,
      description: description.slice(0, 160),
      type: "website",
      images: collection.image ? [{ url: collection.image.url }] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const collection = await fetchCollection(handle);
  if (!collection) notFound();

  const products = collection.products.nodes;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description:
      collection.descriptionHtml?.replace(/<[^>]+>/g, "").slice(0, 300) ||
      `A curated edit of ${products.length} Nailismo press-on sets.`,
    url: `${siteUrl}/collections/${collection.handle}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/products/${p.handle}`,
        name: p.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <Link href="/shop" className="candy-crumb">Shop</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>{collection.title}</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">The edit</span>
          <h1 style={{ marginTop: 10 }}>{collection.title}</h1>
          {collection.descriptionHtml ? (
            <div className="candy-prose" style={{ marginTop: 12, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }} />
          ) : (
            <p>A curated flavor edit — handpicked sets in one place.</p>
          )}
          <p style={{ marginTop: 8 }}><strong>{products.length}</strong> {products.length === 1 ? "set" : "sets"}</p>
        </div>

        <CollectionBrowser products={products} handle={collection.handle} />

        <div style={{ marginTop: 64 }}>
          <UgcStrip />
        </div>
      </main>
    </>
  );
}
