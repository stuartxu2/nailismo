import Link from "next/link";
import Image from "next/image";
import type { ShopifyProduct } from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";
import { cardDots } from "@/lib/product-colors";

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

/** "You may also like" — Shopify product recommendations rendered with the
 *  same candy card the shop grid uses, so the PDP stays visually consistent. */
export function RelatedProducts({ products }: { products: ShopifyProduct[] }) {
  if (products.length === 0) return null;
  const items = products.slice(0, 4);

  return (
    <section className="candy-sec" style={{ paddingTop: "clamp(56px,8vw,96px)", paddingBottom: 0 }}>
      <div style={{ marginBottom: 28 }}>
        <span className="candy-eyebrow">More to crave</span>
        <h2 style={{ fontSize: "clamp(26px,4vw,40px)", marginTop: 8 }}>You may also like</h2>
      </div>

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
              <Link href={`/products/${p.handle}`} className="candy-card-img" aria-label={p.title}>
                <Image
                  src={img.startsWith("http") ? img : encodeURI(img)}
                  alt={alt}
                  fill
                  sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 280px"
                />
              </Link>
              <div style={{ padding: "16px 6px 6px" }}>
                <div className="candy-cardhead">
                  <div className="candy-cardhead-text">
                    <h3 className="candy-cardtitle">
                      <Link href={`/products/${p.handle}`}>{p.title}</Link>
                    </h3>
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
    </section>
  );
}
