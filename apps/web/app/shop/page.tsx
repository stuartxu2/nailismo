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
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { addToCart } from "@/lib/shopify/cart";
import { cardDots } from "@/lib/product-colors";

export const metadata: Metadata = {
  title: "Shop · Nailismo",
  description:
    "Every Nailismo press-on set, filterable and sortable. Bright, collectible flavors — ready in minutes, easy to remove.",
  alternates: { canonical: "/shop" },
};

type SearchParams = { tag?: string; sort?: string };

const SORT_OPTIONS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "title", label: "A–Z" },
] as const;


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

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
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

function buildHref(current: SearchParams, patch: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  if (merged.tag) params.set("tag", merged.tag);
  if (merged.sort && merged.sort !== "featured") params.set("sort", merged.sort);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTag = params.tag ?? "";
  const activeSort = params.sort ?? "featured";

  const [all, collections] = await Promise.all([
    fetchProducts(),
    fetchCollections(),
  ]);
  const tagOptions = collectTags(all);
  const filtered = activeTag
    ? all.filter((p) => p.tags.includes(activeTag))
    : all;
  const items = sortProducts(filtered, activeSort);

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
      numberOfItems: items.length,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/product/${p.handle}`,
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
      <AnnouncementTicker />
      <Header />
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
              adhesive ship in every box. <strong>{items.length}</strong>{" "}
              {items.length === 1 ? "set" : "sets"}
              {activeTag ? ` · ${activeTag}` : ""}.
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

        <section className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
            <div>
              <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Filter</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Link href={buildHref(params, { tag: undefined })} className={`candy-chip ${!activeTag ? "is-active" : ""}`}>All</Link>
                {tagOptions.map((t) => (
                  <Link
                    key={t}
                    href={buildHref(params, { tag: activeTag === t ? undefined : t })}
                    className={`candy-chip ${activeTag === t ? "is-active" : ""}`}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Sort</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SORT_OPTIONS.map((s) => (
                  <Link key={s.key} href={buildHref(params, { sort: s.key })} className={`candy-chip ${activeSort === s.key ? "is-active" : ""}`}>
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="candy-empty">
              <div className="emoji" aria-hidden>🫥</div>
              <h2>No flavors match that filter</h2>
              <p>Try clearing it — the whole rack is waiting.</p>
              <Link href="/shop" className="candy-btn" style={{ marginTop: 22 }}>Clear filters</Link>
            </div>
          ) : (
            <div className="candy-grid">
              {items.map((p, i) => {
                const price = formatPrice(
                  p.priceRange.minVariantPrice.amount,
                  p.priceRange.minVariantPrice.currencyCode,
                );
                const img = p.featuredImage?.url ?? "/images/listing/black and white press on nails.avif";
                const alt = p.featuredImage?.altText ?? p.title;
                const variant = p.variants?.nodes[0];
                const canAdd = variant?.availableForSale ?? false;
                const { dots, labeled } = cardDots(p.tags, i);
                return (
                  <article key={p.id} className="candy-card">
                    {i === 0 && (
                      <span className="candy-sticker is-gum" style={{ position: "absolute", top: -10, left: 16, zIndex: 2 }}>
                        Editor pick
                      </span>
                    )}
                    <Link href={`/product/${p.handle}`} className="candy-card-img" aria-label={p.title}>
                      <Image src={img.startsWith("http") ? img : encodeURI(img)} alt={alt} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 280px" />
                    </Link>
                    <div style={{ padding: "16px 6px 6px" }}>
                      <div className="candy-cardhead">
                        <div className="candy-cardhead-text">
                          <h2 className="candy-cardtitle">
                            <Link href={`/product/${p.handle}`}>{p.title}</Link>
                          </h2>
                        </div>
                        <span className="candy-cardprice">{price}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                        <span
                          style={{ display: "inline-flex", gap: 6 }}
                          aria-label={
                            labeled ? `Colors: ${dots.map((d) => d.name).join(", ")}` : undefined
                          }
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
                        {canAdd && variant ? (
                          <form action={addToCart}>
                            <input type="hidden" name="variantId" value={variant.id} />
                            <input type="hidden" name="quantity" value="1" />
                            <button type="submit" className="candy-quickadd" aria-label={`Add ${p.title} to bag`}>+</button>
                          </form>
                        ) : (
                          <span className="candy-chip" style={{ opacity: 0.6, cursor: "default" }}>Sold out</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
