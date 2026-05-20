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
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

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
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <a href="/" className="ulink">Home</a>
              <span>/</span>
              <a href="/shop" className="ulink">Shop</a>
              <span>/</span>
              <span className="text-tetsu">{collection.title}</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">Edit</span>
                  <span className="cap">{collection.handle}</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  {collection.title}
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-5">
                {collection.descriptionHtml ? (
                  <div
                    className="text-rikyu max-w-[460px] [&_p]:mb-3"
                    dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
                  />
                ) : (
                  <p className="text-rikyu max-w-[460px]">
                    A focused edit. Ranked by what men actually pick first in this lane.
                  </p>
                )}
                <div className="mt-6 cap">
                  {products.length} {products.length === 1 ? "set" : "sets"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {collection.image && (
          <section className="mt-12 md:mt-16">
            <div className="nail-container">
              <div className="relative aspect-[16/6] overflow-hidden bg-shiracha border border-hair">
                <img
                  src={collection.image.url}
                  alt={collection.image.altText ?? collection.title}
                  className="img-cover"
                />
                <span className="corner-mark top-4 left-4">
                  {collection.handle} · cover
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-8 mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="cap mb-3 block">Sort</span>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((s) => (
                    <a
                      key={s.key}
                      href={buildHref(collection.handle, s.key)}
                      className={`edit-pill ${activeSort === s.key ? "edit-pill-active" : ""}`}
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
              <a href="/shop" className="ulink cap">
                View Full Index →
              </a>
            </div>

            {products.length === 0 ? (
              <div className="border border-hair py-24 text-center">
                <span className="cap block mb-4">Empty Edit</span>
                <p className="font-display text-[24px] text-tetsu">
                  No sets in this edit yet.
                </p>
                <a href="/shop" className="btn-ghost mt-8 inline-flex">
                  Browse The Index <span className="arrow">→</span>
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-5">
                {products.map((p, i) => {
                  const num = `N°${String(i + 1).padStart(2, "0")}`;
                  const meta =
                    [p.productType, p.tags[0]].filter(Boolean).join(" · ") ||
                    "Press-On Set";
                  const price = formatPrice(
                    p.priceRange.minVariantPrice.amount,
                    p.priceRange.minVariantPrice.currencyCode,
                  );
                  const img =
                    p.featuredImage?.url ??
                    "/images/listing/black and white press on nails.jpg";
                  const alt = p.featuredImage?.altText ?? p.title;
                  return (
                    <article
                      key={p.id}
                      className="col-span-6 md:col-span-4 lg:col-span-3 group border border-hair bg-paper flex flex-col edit-card"
                    >
                      <a
                        href={`/product/${p.handle}`}
                        className="relative aspect-square overflow-hidden bg-shiracha block"
                      >
                        <img src={img} alt={alt} className="img-cover edit-image" />
                        <span className="absolute top-3 left-3 cap text-paper bg-tetsu px-2 py-1">
                          {num}
                        </span>
                      </a>
                      <div className="p-4 flex flex-col flex-1">
                        <h2 className="font-display text-[18px] leading-[1.1]">
                          <a href={`/product/${p.handle}`} className="ulink">
                            {p.title}
                          </a>
                        </h2>
                        <div className="mt-1 flex items-center justify-between text-[12px] text-rikyu">
                          <span>{meta}</span>
                          <span className="font-display text-[16px] text-tetsu">
                            {price}
                          </span>
                        </div>
                        {p.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.16em] font-mono text-rikyu">
                            {p.tags.slice(0, 3).map((t) => (
                              <span key={t} className="px-1.5 py-0.5 border border-hair">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                          <a
                            href={`/product/${p.handle}`}
                            className="ulink text-[10px] tracking-[0.18em] uppercase font-medium"
                          >
                            Details →
                          </a>
                          <a
                            href={`/product/${p.handle}`}
                            className="bg-tetsu text-paper px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase font-medium hover:bg-akane transition-colors"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-12 flex items-center justify-between flex-wrap gap-3 border-t border-hair pt-8">
              <span className="cap">Edit · {collection.handle}</span>
              <a href="/shop" className="btn-ghost">
                Open Full Index <span className="arrow">→</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
