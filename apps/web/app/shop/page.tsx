import Link from "next/link";
import Image from "next/image";
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

// Decorative fallback when a product has no color tag.
const SWATCHES = ["#9FED40", "#60779F", "#271028", "#C9B6D2", "#6FBF1F"];

// Color tags applied to products by tools/shopify_color_tags.py → swatch hex.
const COLOR_HEX: Record<string, string> = {
  Black: "#271028",
  White: "#FFFFFF",
  Silver: "#C5CAD3",
  Gold: "#D4AF37",
  Red: "#E2342B",
  Blue: "#3B6FB5",
  Green: "#4FAE35",
  Grey: "#9AA0A8",
  Brown: "#8B5A2B",
  Nude: "#E6C2A6",
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
                const meta =
                  [p.productType, p.tags[0]].filter(Boolean).join(" · ") || "Press-On Set";
                const price = formatPrice(
                  p.priceRange.minVariantPrice.amount,
                  p.priceRange.minVariantPrice.currencyCode,
                );
                const img = p.featuredImage?.url ?? "/images/listing/black and white press on nails.avif";
                const alt = p.featuredImage?.altText ?? p.title;
                const variant = p.variants?.nodes[0];
                const canAdd = variant?.availableForSale ?? false;
                const colorDots = p.tags
                  .filter((t) => t in COLOR_HEX)
                  .slice(0, 2)
                  .map((name) => ({ name, hex: COLOR_HEX[name] }));
                const dots = colorDots.length
                  ? colorDots
                  : [
                      { name: "", hex: SWATCHES[i % SWATCHES.length] },
                      { name: "", hex: SWATCHES[(i + 2) % SWATCHES.length] },
                    ];
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <h2 style={{ fontSize: 20 }}>
                            <Link href={`/product/${p.handle}`}>{p.title}</Link>
                          </h2>
                          <p style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 700, marginTop: 2 }}>{meta}</p>
                        </div>
                        <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 19 }}>{price}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                        <span
                          style={{ display: "inline-flex", gap: 6 }}
                          aria-label={
                            colorDots.length
                              ? `Colors: ${colorDots.map((d) => d.name).join(", ")}`
                              : undefined
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
