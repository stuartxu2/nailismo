import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { SEARCH_PRODUCTS_QUERY } from "@/lib/shopify/queries";
import type { SearchProductsQueryResult, ShopifyProduct } from "@/lib/shopify/types";
import { cardDots } from "@/lib/product-colors";

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
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Search</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Find your flavor</span>
          <h1 style={{ marginTop: 10 }}>Search the rack</h1>
          <form action="/search" method="GET" style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <input
              type="text"
              name="q"
              defaultValue={trimmed}
              placeholder="silver, matte, chrome…"
              autoFocus
              aria-label="Search products"
              className="candy-field"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button type="submit" className="candy-btn">Search <span className="pop" aria-hidden>🔍</span></button>
          </form>
          <p style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
            Searches across title, tags, and product type.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 36, marginBottom: 28 }}>
          <span className="candy-eyebrow">
            {trimmed ? `${results.length} result${results.length === 1 ? "" : "s"} for “${trimmed}”` : "Type a query to start"}
          </span>
          <Link href="/shop" className="candy-btn is-ghost" style={{ padding: "10px 18px", fontSize: 14 }}>Browse all</Link>
        </div>

        {!trimmed ? (
          <div className="candy-empty">
            <div className="emoji" aria-hidden>🍭</div>
            <h2>What are you craving?</h2>
            <p>Try one of these:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 18 }}>
              {["silver", "matte", "christmas", "french", "chrome", "g-dragon"].map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="candy-chip">{t}</Link>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="candy-empty">
            <div className="emoji" aria-hidden>🫥</div>
            <h2>Nothing matched “{trimmed}”</h2>
            <p>Try a different word — or browse the whole rack.</p>
            <Link href="/shop" className="candy-btn" style={{ marginTop: 22 }}>Browse all</Link>
          </div>
        ) : (
          <div className="candy-grid">
            {results.map((p, i) => {
              const price = formatPrice(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode);
              const img = p.featuredImage?.url ?? "/images/listing/black and white press on nails.avif";
              const alt = p.featuredImage?.altText ?? p.title;
              const { dots, labeled } = cardDots(p.tags, i);
              return (
                <Link key={p.id} href={`/products/${p.handle}`} className="candy-card" aria-label={`${p.title} — ${price}`}>
                  <div className="candy-card-img">
                    <Image src={img.startsWith("http") ? img : encodeURI(img)} alt={alt} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 280px" />
                  </div>
                  <div style={{ padding: "16px 6px 6px" }}>
                    <div className="candy-cardhead">
                      <div className="candy-cardhead-text">
                        <h2 className="candy-cardtitle">{p.title}</h2>
                      </div>
                      <span className="candy-cardprice">{price}</span>
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
      </main>
    </>
  );
}
