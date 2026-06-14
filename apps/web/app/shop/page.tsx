import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCTS_QUERY, COLLECTIONS_QUERY } from "@/lib/shopify/queries";
import type {
  ProductsQueryResult,
  ShopifyProduct,
  CollectionsQueryResult,
  ShopifyCollectionCard,
} from "@/lib/shopify/types";
import { ShopBrowser } from "./ShopBrowser";

export const metadata: Metadata = {
  title: "Shop · Nailismo",
  description:
    "Every Nailismo press-on set, filterable and sortable. Bright, collectible flavors — ready in minutes, easy to remove.",
  alternates: { canonical: "/shop" },
};

async function fetchProducts(): Promise<ShopifyProduct[]> {
  try {
    const data = await storefrontFetch<ProductsQueryResult>(
      PRODUCTS_QUERY,
      { first: 50 },
      { revalidate: 300 },
    );
    return data.products.nodes;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] shop fetch failed:", err);
    }
    return [];
  }
}

// Single-color smart collections live behind the on-card swatch filters, so they
// are deliberately hidden from the editorial collection shelf. `featured-products`
// is an internal tag aggregate and `seasonal-surge` is currently empty.
const EXCLUDED_COLLECTION_HANDLES = new Set([
  "black", "white", "silver", "gold", "red", "blue", "green", "grey", "brown",
  "featured-products", "seasonal-surge",
]);

async function fetchCollections(): Promise<ShopifyCollectionCard[]> {
  try {
    const data = await storefrontFetch<CollectionsQueryResult>(
      COLLECTIONS_QUERY,
      { first: 50 },
      { revalidate: 300 },
    );
    return data.collections.nodes.filter(
      (c) =>
        !EXCLUDED_COLLECTION_HANDLES.has(c.handle) &&
        (c.image || c.products.nodes[0]?.featuredImage),
    );
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] shop collections fetch failed:", err);
    }
    return [];
  }
}

function collectionImage(c: ShopifyCollectionCard): { url: string; alt: string } {
  const img = c.image ?? c.products.nodes[0]?.featuredImage;
  return {
    url: img?.url ?? "/images/listing/black and white press on nails.avif",
    alt: img?.altText ?? `${c.title} collection`,
  };
}

function collectTags(products: ShopifyProduct[]): string[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);
}

export default async function ShopPage() {
  const [all, collections] = await Promise.all([
    fetchProducts(),
    fetchCollections(),
  ]);
  const tagOptions = collectTags(all);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";
  const shopSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shop every flavor",
    description:
      "Every Nailismo press-on set — minimalist, statement, and expressive looks. Sizing range and adhesive ship in every box.",
    url: `${siteUrl}/shop`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: all.length,
      itemListElement: all.map((p, i) => ({
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopSchema) }}
      />
      <main>
        <section className="candy-wrap" style={{ paddingTop: 36 }}>
          <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Link href="/" className="candy-crumb">Home</Link>
            <Link href="/shop" className="candy-crumb" aria-current="page">Shop</Link>
          </nav>

          <div className="candy-pagehead">
            <span className="candy-eyebrow">The candy rack</span>
            <h1 style={{ marginTop: 10 }}>Shop every flavor</h1>
            <p>
              Every set on the shelf — filter by vibe, sort by price. Sizing range and
              adhesive ship in every box. <strong>{all.length}</strong>{" "}
              {all.length === 1 ? "set" : "sets"}.
            </p>
          </div>
        </section>

        {collections.length > 0 && (
          <section style={{ paddingTop: 40 }}>
            <div className="candy-wrap" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 22 }}>
              <div>
                <span className="candy-eyebrow">Shop by collection</span>
                <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", marginTop: 8 }}>Pick your edit</h2>
              </div>
            </div>
            <div className="candy-rack" role="list" aria-label="Collections">
              {collections.map((c) => {
                const { url, alt } = collectionImage(c);
                return (
                  <Link
                    key={c.id}
                    href={`/collections/${c.handle}`}
                    className="candy-collcard"
                    role="listitem"
                  >
                    <div className="candy-collcard-img">
                      <Image
                        src={url.startsWith("http") ? url : encodeURI(url)}
                        alt={alt}
                        fill
                        sizes="240px"
                      />
                      <span className="candy-collcard-veil" aria-hidden />
                      <span className="candy-collcard-title">{c.title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <ShopBrowser products={all} tagOptions={tagOptions} />
      </main>
    </>
  );
}
