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
  ShopifyProduct,
} from "@/lib/shopify/types";
import Image from "next/image";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { UgcStrip } from "@/app/components/UgcStrip";
import { cardDots } from "@/lib/product-colors";

type Params = { handle: string };
type SearchParams = { sort?: string };

const SORT_OPTIONS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "title", label: "A–Z" },
] as const;

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

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

function sortProducts(products: ShopifyProduct[], sort: string): ShopifyProduct[] {
  const copy = [...products];
  if (sort === "price-asc") {
    copy.sort(
      (a, b) =>
        Number(a.priceRange.minVariantPrice.amount) -
        Number(b.priceRange.minVariantPrice.amount),
    );
  } else if (sort === "price-desc") {
    copy.sort(
      (a, b) =>
        Number(b.priceRange.minVariantPrice.amount) -
        Number(a.priceRange.minVariantPrice.amount),
    );
  } else if (sort === "title") {
    copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  return copy;
}

function buildHref(handle: string, sort: string): string {
  if (!sort || sort === "featured") return `/collections/${handle}`;
  return `/collections/${handle}?sort=${sort}`;
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const collection = await fetchCollection(handle);
  if (!collection) notFound();

  const activeSort = sp.sort ?? "featured";
  const products = sortProducts(collection.products.nodes, activeSort);

  return (
    <>
      <AnnouncementTicker />
      <Header />
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

        {collection.image && (
          <div style={{ position: "relative", aspectRatio: "16/6", borderRadius: 28, overflow: "hidden", border: "2.5px solid var(--ink)", boxShadow: "var(--shadow-candy)", marginTop: 24 }}>
            <Image src={collection.image.url} alt={collection.image.altText ?? collection.title} fill sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginTop: 36, marginBottom: 28 }}>
          <div>
            <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Sort</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SORT_OPTIONS.map((s) => (
                <Link key={s.key} href={buildHref(collection.handle, s.key)} className={`candy-chip ${activeSort === s.key ? "is-active" : ""}`}>{s.label}</Link>
              ))}
            </div>
          </div>
          <Link href="/shop" className="candy-btn is-ghost" style={{ padding: "12px 22px", fontSize: 15 }}>View all</Link>
        </div>

        {products.length === 0 ? (
          <div className="candy-empty">
            <div className="emoji" aria-hidden>🍬</div>
            <h2>No sets in this edit yet</h2>
            <p>Check back soon — or browse the full rack.</p>
            <Link href="/shop" className="candy-btn" style={{ marginTop: 22 }}>Browse all</Link>
          </div>
        ) : (
          <div className="candy-grid">
            {products.map((p, i) => {
              const meta = [p.productType, p.tags[0]].filter(Boolean).join(" · ") || "Press-On Set";
              const price = formatPrice(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode);
              const img = p.featuredImage?.url ?? "/images/listing/black and white press on nails.avif";
              const alt = p.featuredImage?.altText ?? p.title;
              const { dots, labeled } = cardDots(p.tags, i);
              return (
                <Link key={p.id} href={`/product/${p.handle}`} className="candy-card" aria-label={`${p.title} — ${price}`}>
                  <div className="candy-card-img">
                    <Image src={img.startsWith("http") ? img : encodeURI(img)} alt={alt} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 280px" />
                  </div>
                  <div style={{ padding: "16px 6px 6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <h2 style={{ fontSize: 20 }}>{p.title}</h2>
                        <p style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 700, marginTop: 2 }}>{meta}</p>
                      </div>
                      <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 19 }}>{price}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                      <span
                        style={{ display: "inline-flex", gap: 6 }}
                        aria-label={labeled ? `Colors: ${dots.map((d) => d.name).join(", ")}` : undefined}
                      >
                        {dots.map((c, j) => (
                          <span
                            key={j}
                            className="candy-swatch"
                            style={{ background: c.hex }}
                            title={c.name || undefined}
                            aria-hidden={c.name ? undefined : true}
                          />
                        ))}
                      </span>
                      <span className="candy-quickadd" aria-hidden>→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 64 }}>
          <UgcStrip />
        </div>
      </main>
      <Footer />
    </>
  );
}
