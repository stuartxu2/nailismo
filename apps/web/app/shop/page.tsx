import Link from "next/link";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCTS_QUERY } from "@/lib/shopify/queries";
import type { ProductsQueryResult, ShopifyProduct } from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { addToCart } from "@/lib/shopify/cart";

export const metadata: Metadata = {
  title: "Shop · Nailismo",
  description:
    "Every Nailismo press-on set, ranked and filterable. Daily, nightlife, statement — built for men, sized to fit.",
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

  const all = await fetchProducts();
  const tagOptions = collectTags(all);
  const filtered = activeTag
    ? all.filter((p) => p.tags.includes(activeTag))
    : all;
  const items = sortProducts(filtered, activeSort);

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0 relative">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <Link href="/" className="ulink">Home</Link>
              <span>/</span>
              <span className="text-tetsu">Shop</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">Index · Press-On Sets</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  The full
                  <br />
                  <span className="italic font-serif font-light">index</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">
                  Every set on the shelf. Filter by occasion, sort by price.
                  Sizing range and adhesive ship with each box.
                </p>
                <div className="mt-6 flex items-center gap-4 cap">
                  <span>
                    {items.length} {items.length === 1 ? "set" : "sets"}
                  </span>
                  {activeTag && (
                    <>
                      <span aria-hidden>·</span>
                      <span>tag: {activeTag}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-8 mb-10 grid grid-cols-12 gap-6 items-start">
              <div className="col-span-12 lg:col-span-8">
                <span className="cap mb-4 block">Filter</span>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildHref(params, { tag: undefined })}
                    className={`edit-pill ${!activeTag ? "edit-pill-active" : ""}`}
                  >
                    All
                  </a>
                  {tagOptions.map((t) => (
                    <a
                      key={t}
                      href={buildHref(params, { tag: activeTag === t ? undefined : t })}
                      className={`edit-pill ${activeTag === t ? "edit-pill-active" : ""}`}
                    >
                      {t}
                    </a>
                  ))}
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4">
                <span className="cap mb-4 block">Sort</span>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((s) => (
                    <a
                      key={s.key}
                      href={buildHref(params, { sort: s.key })}
                      className={`edit-pill ${activeSort === s.key ? "edit-pill-active" : ""}`}
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="border border-hair py-24 text-center">
                <span className="cap block mb-4">Empty Shelf</span>
                <p className="font-display text-[24px] text-tetsu">
                  No sets match this filter.
                </p>
                <Link href="/shop" className="ulink mt-6 inline-block cap">
                  Clear filters →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-5">
                {items.map((p) => {
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
                  const variant = p.variants?.nodes[0];
                  const canAdd = variant?.availableForSale ?? false;
                  return (
                    <article
                      key={p.id}
                      className="col-span-6 md:col-span-4 lg:col-span-3 group border border-hair bg-paper flex flex-col edit-card"
                    >
                      <Link
                        href={`/product/${p.handle}`}
                        className="relative aspect-square overflow-hidden bg-shiracha block"
                      >
                        <img src={img} alt={alt} className="img-cover edit-image" />
                      </Link>
                      <div className="p-4 flex flex-col flex-1">
                        <h2 className="font-display text-[18px] leading-[1.1]">
                          <Link href={`/product/${p.handle}`} className="ulink">
                            {p.title}
                          </Link>
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
                          <Link
                            href={`/product/${p.handle}`}
                            className="ulink text-[10px] tracking-[0.18em] uppercase font-medium"
                          >
                            Details →
                          </Link>
                          {canAdd && variant ? (
                            <form action={addToCart}>
                              <input type="hidden" name="variantId" value={variant.id} />
                              <input type="hidden" name="quantity" value="1" />
                              <button
                                type="submit"
                                className="bg-tetsu text-paper px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase font-medium hover:bg-akane transition-colors"
                              >
                                Add To Cart
                              </button>
                            </form>
                          ) : (
                            <span className="px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase font-medium text-rikyu opacity-60">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-12 flex items-center justify-between flex-wrap gap-3 border-t border-hair pt-8">
              <span className="cap">Index refreshed every 5 min · Shopify Storefront</span>
              <Link href="/" className="btn-ghost">
                Back To Home <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
