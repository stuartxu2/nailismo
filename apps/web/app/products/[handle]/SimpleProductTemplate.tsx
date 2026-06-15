import Link from "next/link";
import type { ShopifyProductDetail, ShopifyProduct } from "@/lib/shopify/types";
import type { Review } from "./reviews";
import { ProductGallery, type GalleryItem } from "./ProductGallery";
import { SimplePurchasePanel } from "./SimplePurchasePanel";
import { ProductReviews } from "./ProductReviews";
import { RelatedProducts } from "./RelatedProducts";

type Kind = "gift" | "essential";

type InfoItem = { k: string; v: string };

const COPY: Record<Kind, { eyebrow: string; cta: string; info: InfoItem[] }> = {
  gift: {
    eyebrow: "Digital Gift Card",
    cta: "Add Gift Card",
    info: [
      { k: "Delivery", v: "Instant email" },
      { k: "Validity", v: "Never expires" },
      { k: "Redeem", v: "At checkout" },
      { k: "Amounts", v: "$10–$50" },
    ],
  },
  essential: {
    eyebrow: "Nail Care",
    cta: "Add to Bag",
    info: [
      { k: "Formula", v: "Salon-grade" },
      { k: "Pairs with", v: "Any set" },
      { k: "Cruelty-free", v: "Always" },
      { k: "Returns", v: "30 days" },
    ],
  },
};

const GIFT_STEPS = [
  { emoji: "🎁", title: "Pick an amount", body: "Choose $10, $25, or $50 — whatever fits the moment." },
  { emoji: "📧", title: "We email the code", body: "Sent to your inbox, or straight to them with a note." },
  { emoji: "🛍️", title: "Redeem at checkout", body: "Applies to any order on Nailismo, anytime." },
];

/** Leaner PDP for non-nail products (gift cards, care essentials). Shares the
 *  gallery + buy box chrome but drops sizing, the press-on guide, and press-on
 *  FAQ that only make sense for nail sets. */
export function SimpleProductTemplate({
  product,
  galleryItems,
  defaultVariantId,
  reviews,
  recommendations,
  kind,
}: {
  product: ShopifyProductDetail;
  galleryItems: GalleryItem[];
  defaultVariantId: string | null;
  reviews: Review[];
  recommendations: ShopifyProduct[];
  kind: Kind;
}) {
  const copy = COPY[kind];

  return (
    <>
      <main className="candy-wrap candy-sec" style={{ paddingTop: 28 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <Link href="/shop" className="candy-crumb">Shop</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>{product.title}</span>
        </nav>

        <div className="grid grid-cols-12 gap-6 md:gap-12 items-start">
          <div className="col-span-12 lg:col-span-7">
            <ProductGallery items={galleryItems} title={product.title} />
          </div>

          <div className="col-span-12 lg:col-span-5 lg:sticky lg:top-24">
            <span className="candy-eyebrow">{copy.eyebrow}</span>
            <h1 style={{ marginTop: 10, fontSize: "clamp(36px,5vw,68px)" }}>{product.title}</h1>

            <SimplePurchasePanel
              options={product.options}
              variants={product.variants.nodes}
              defaultVariantId={defaultVariantId}
              kind={kind}
              ctaLabel={copy.cta}
            />

            {product.descriptionHtml && (
              <div style={{ marginTop: 32 }}>
                <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Details</span>
                <div className="candy-prose" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
              </div>
            )}

            <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {copy.info.map((c) => (
                <div key={c.k} style={{ background: "var(--cream)", border: "1px solid var(--marshmallow)", borderRadius: 18, padding: "14px 16px", boxShadow: "var(--shadow-candy)" }}>
                  <span className="candy-eyebrow" style={{ fontSize: 11 }}>{c.k}</span>
                  <p style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 16, marginTop: 4 }}>{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {kind === "gift" && (
          <section className="candy-sec" style={{ paddingBottom: 0 }} aria-labelledby="gift-how-heading">
            <div style={{ marginBottom: 28 }}>
              <span className="candy-eyebrow">So easy it&apos;s silly</span>
              <h2 id="gift-how-heading" style={{ fontSize: "clamp(26px,4vw,40px)", marginTop: 8 }}>How gifting works</h2>
            </div>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {GIFT_STEPS.map((s, i) => (
                <div key={s.title} style={{ background: "var(--cream)", border: "1px solid var(--marshmallow)", borderRadius: 22, padding: "22px 22px 24px", boxShadow: "var(--shadow-candy)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "var(--lemon)", border: "2.5px solid var(--ink)", fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, boxShadow: "0 3px 0 var(--ink)" }}>{i + 1}</span>
                    <span aria-hidden style={{ fontSize: 24, lineHeight: 1 }}>{s.emoji}</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 21, color: "var(--ink)", marginBottom: 7 }}>{s.title}</h3>
                  <p style={{ fontFamily: "var(--body)", fontWeight: 600, fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-soft)" }}>{s.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <RelatedProducts products={recommendations} />

        <ProductReviews reviews={reviews} productTitle={product.title} />
      </main>
      {/* clearance so the mobile sticky Add bar never covers the footer */}
      <div aria-hidden className="md:hidden" style={{ height: 84 }} />
    </>
  );
}
