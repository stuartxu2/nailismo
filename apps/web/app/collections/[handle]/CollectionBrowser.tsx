"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ShopifyProduct } from "@/lib/shopify/types";
import { cardDots } from "@/lib/product-colors";

// Sorting runs client-side so /collections/[handle] stays statically prerendered
// (reading searchParams on the server forced the route dynamic / uncached). The
// full product list is passed in, so every product is in the static HTML.

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

function collectionHref(handle: string, sort: string): string {
  if (!sort || sort === "featured") return `/collections/${handle}`;
  return `/collections/${handle}?sort=${sort}`;
}

export function CollectionBrowser({
  products,
  handle,
}: {
  products: ShopifyProduct[];
  handle: string;
}) {
  const [activeSort, setActiveSort] = useState("featured");

  // Honor ?sort deep link after hydration (reading it at render would re-opt the
  // route into dynamic rendering).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("sort") ?? "featured";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply ?sort deep link once after hydration (avoids SSR mismatch)
    if (s !== "featured") setActiveSort(s);
  }, []);

  function selectSort(sort: string) {
    setActiveSort(sort);
    window.history.replaceState(null, "", collectionHref(handle, sort));
  }

  const items = sortProducts(products, activeSort);

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginTop: 36, marginBottom: 28 }}>
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
        <Link href="/shop" className="candy-btn is-ghost" style={{ padding: "12px 22px", fontSize: 15 }}>View all</Link>
      </div>

      {items.length === 0 ? (
        <div className="candy-empty">
          <div className="emoji" aria-hidden>🍬</div>
          <h2>No sets in this edit yet</h2>
          <p>Check back soon — or browse the full rack.</p>
          <Link href="/shop" className="candy-btn" style={{ marginTop: 22 }}>Browse all</Link>
        </div>
      ) : (
        <div className="candy-grid">
          {items.map((p, i) => {
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
    </>
  );
}
