import Link from "next/link";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { SEARCH_PRODUCTS_QUERY } from "@/lib/shopify/queries";
import type { SearchProductsQueryResult, ShopifyProduct } from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Search · Nailismo",
  description: "Search every Nailismo press-on set by name, finish, or vibe.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

async function fetchSearch(query: string): Promise<ShopifyProduct[]> {
  if (!query.trim()) return [];
  try {
    const data = await storefrontFetch<SearchProductsQueryResult>(
      SEARCH_PRODUCTS_QUERY,
      { query, first: 50 },
      { revalidate: 60 },
    );
    return data.products.nodes;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] search failed:", err);
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q = "" } = await searchParams;
  const trimmed = q.trim();
  const results = await fetchSearch(trimmed);

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <Link href="/" className="ulink">Home</Link>
              <span>/</span>
              <span className="text-tetsu">Search</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">Index Search</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  Find
                  <br />
                  <span className="italic font-serif font-light">your set</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-5">
                <form action="/search" method="GET" className="flex items-stretch border border-hair bg-paper">
                  <input
                    type="text"
                    name="q"
                    defaultValue={trimmed}
                    placeholder="silver, matte, halloween…"
                    autoFocus
                    className="flex-1 px-4 py-3 bg-transparent text-[15px] outline-none placeholder:text-gin"
                    aria-label="Search products"
                  />
                  <button
                    type="submit"
                    className="bg-tetsu text-paper px-5 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-akane transition-colors"
                  >
                    Search
                  </button>
                </form>
                <p className="mt-4 text-[12px] text-rikyu">
                  Searches across title, tags, and product type.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-8 mb-10 flex items-center justify-between flex-wrap gap-3">
              <span className="cap">
                {trimmed
                  ? `${results.length} result${results.length === 1 ? "" : "s"} for "${trimmed}"`
                  : "Type a query to start"}
              </span>
              <Link href="/shop" className="ulink cap">Browse full index →</Link>
            </div>

            {!trimmed ? (
              <div className="border border-hair py-24 text-center">
                <span className="cap block mb-4">Try</span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["silver", "matte", "christmas", "french", "chrome", "g-dragon"].map((t) => (
                    <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="edit-pill">
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="border border-hair py-24 text-center">
                <span className="cap block mb-4">No matches</span>
                <p className="font-display text-[24px] text-tetsu">
                  Nothing matched &ldquo;{trimmed}&rdquo;.
                </p>
                <Link href="/shop" className="btn-ghost mt-8 inline-flex">
                  Open Full Index <span className="arrow">→</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-5">
                {results.map((p, i) => {
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
                      <Link
                        href={`/product/${p.handle}`}
                        className="relative aspect-square overflow-hidden bg-shiracha block"
                      >
                        <img src={img} alt={alt} className="img-cover edit-image" />
                        <span className="absolute top-3 left-3 cap text-paper bg-tetsu px-2 py-1">
                          {num}
                        </span>
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
                        <div className="mt-auto pt-4">
                          <Link
                            href={`/product/${p.handle}`}
                            className="ulink text-[10px] tracking-[0.18em] uppercase font-medium"
                          >
                            Open →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
