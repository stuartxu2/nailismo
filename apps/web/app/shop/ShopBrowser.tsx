"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ShopifyProduct } from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";
import { cardDots } from "@/lib/product-colors";

// Filtering/sorting runs client-side so /shop stays statically prerendered
// (reading searchParams on the server forced the whole route dynamic / uncached).
// The full product list is passed in as a prop, so every product is present in
// the server-rendered static HTML — filters are a client enhancement on top.

const SORT_OPTIONS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "title", label: "A–Z" },
] as const;

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

function shopHref(tag: string, sort: string): string {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (sort && sort !== "featured") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export function ShopBrowser({
  products,
  tagOptions,
}: {
  products: ShopifyProduct[];
  tagOptions: string[];
}) {
  const [activeTag, setActiveTag] = useState("");
  const [activeSort, setActiveSort] = useState("featured");

  // Honor ?tag / ?sort deep links after hydration (reading them at render would
  // re-opt the route into dynamic rendering).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tag") ?? "";
    const s = sp.get("sort") ?? "featured";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply ?tag/?sort deep link once after hydration (avoids SSR mismatch)
    if (t) setActiveTag(t);
    if (s !== "featured") setActiveSort(s);
  }, []);

  function selectTag(tag: string) {
    setActiveTag(tag);
    window.history.replaceState(null, "", shopHref(tag, activeSort));
  }

  function selectSort(sort: string) {
    setActiveSort(sort);
    window.history.replaceState(null, "", shopHref(activeTag, sort));
  }

  const filtered = activeTag ? products.filter((p) => p.tags.includes(activeTag)) : products;
  const items = sortProducts(filtered, activeSort);

  return (
    <section className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
        <div>
          <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Filter</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={() => selectTag("")}
              className={`candy-chip ${!activeTag ? "is-active" : ""}`}
              aria-pressed={!activeTag}
            >
              All
            </button>
            {tagOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectTag(activeTag === t ? "" : t)}
                className={`candy-chip ${activeTag === t ? "is-active" : ""}`}
                aria-pressed={activeTag === t}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Sort</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => selectSort(s.key)}
                className={`candy-chip ${activeSort === s.key ? "is-active" : ""}`}
                aria-pressed={activeSort === s.key}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="candy-empty">
          <div className="emoji" aria-hidden>🫥</div>
          <h2>No flavors match that filter</h2>
          <p>Try clearing it — the whole rack is waiting.</p>
          <button type="button" onClick={() => selectTag("")} className="candy-btn" style={{ marginTop: 22 }}>
            Clear filters
          </button>
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
                <Link href={`/products/${p.handle}`} className="candy-card-img" aria-label={p.title}>
                  <Image src={img.startsWith("http") ? img : encodeURI(img)} alt={alt} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 280px" />
                </Link>
                <div style={{ padding: "16px 6px 6px" }}>
                  <div className="candy-cardhead">
                    <div className="candy-cardhead-text">
                      <h2 className="candy-cardtitle">
                        <Link href={`/products/${p.handle}`}>{p.title}</Link>
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
  );
}
