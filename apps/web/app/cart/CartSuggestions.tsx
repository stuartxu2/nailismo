import Image from "next/image";
import Link from "next/link";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import {
  COLLECTION_BY_HANDLE_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from "@/lib/shopify/queries";
import type {
  CollectionByHandleQueryResult,
  ProductByHandleQueryResult,
  ProductRecommendationsQueryResult,
  ShopifyCartLine,
  ShopifyProduct,
} from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";
import { isBundleEligible } from "@/lib/promo/holiday";
import { pickSuggestions, suggestionsHeading } from "@/lib/promo/cart";

type Card = { handle: string; title: string; image: string | null; price: string; variantId: string; addOn?: boolean };

async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) console.error(`[cart-suggestions] ${label}:`, err);
    return fallback;
  }
}

function price(amount: string): string {
  const n = Number(amount);
  return Number.isFinite(n) ? `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}` : amount;
}

function toCard(p: ShopifyProduct): Card | null {
  const variantId = p.variants?.nodes[0]?.id;
  if (!variantId) return null;
  return {
    handle: p.handle,
    title: p.title,
    image: p.featuredImage?.url ?? null,
    price: price(p.priceRange.minVariantPrice.amount),
    variantId,
  };
}

/** 3-pack suggestions: eligible sets related to the bag (recommendations,
 *  topped up from Best Sellers) plus Nail Glue, labelled as an add-on that
 *  doesn't count, when it isn't already in the bag. Nothing without set cards. */
export async function CartSuggestions({ lines, setCount }: { lines: ShopifyCartLine[]; setCount: number }) {
  const inCart = new Set(lines.map((l) => l.merchandise.product.handle));
  const anchor = lines.find((l) => isBundleEligible(l.merchandise.product.tags));

  const recs = anchor
    ? await safe("recommendations", async () =>
        (await storefrontFetch<ProductRecommendationsQueryResult>(
          PRODUCT_RECOMMENDATIONS_QUERY,
          { productId: anchor.merchandise.product.id },
          { revalidate: 600 },
        )).productRecommendations ?? [], [] as ShopifyProduct[])
    : [];
  let candidates = recs;
  if (pickSuggestions(recs, inCart, 4).length < 3) {
    const best = await safe("best-sellers", async () =>
      (await storefrontFetch<CollectionByHandleQueryResult>(
        COLLECTION_BY_HANDLE_QUERY,
        { handle: "best-sellers", first: 12 },
        { revalidate: 600 },
      )).collection?.products.nodes ?? [], [] as ShopifyProduct[]);
    const seen = new Set(recs.map((p) => p.handle));
    candidates = [...recs, ...best.filter((p) => !seen.has(p.handle))];
  }
  const cards = pickSuggestions(candidates, inCart, 4).map(toCard).filter((c): c is Card => c !== null);
  if (cards.length === 0) return null;

  if (!inCart.has("nail-glue")) {
    const glue = await safe("nail-glue", async () =>
      (await storefrontFetch<ProductByHandleQueryResult>(
        PRODUCT_BY_HANDLE_QUERY,
        { handle: "nail-glue" },
        { revalidate: 600 },
      )).product, null);
    const v = glue?.variants.nodes.find((n) => n.availableForSale);
    if (glue && v) {
      cards.push({
        handle: glue.handle,
        title: glue.title,
        image: glue.featuredImage?.url ?? null,
        price: price(v.price.amount),
        variantId: v.id,
        addOn: true,
      });
    }
  }

  const heading = suggestionsHeading(setCount);
  return (
    <section aria-label={heading} style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: "clamp(22px,3vw,30px)" }}>{heading}</h2>
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 14,
        }}
      >
        {cards.map((c) => (
          <article
            key={c.handle}
            style={{
              background: "var(--cream)",
              border: "1px solid var(--marshmallow)",
              borderRadius: 18,
              padding: 10,
              boxShadow: "var(--shadow-candy)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <Link href={`/products/${c.handle}`} style={{ display: "block" }}>
              <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 12, overflow: "hidden", background: "var(--marshmallow)" }}>
                {c.image && <Image src={c.image} alt={`${c.title} press-on nails`} fill sizes="160px" style={{ objectFit: "cover" }} />}
              </div>
              <p style={{ marginTop: 8, fontFamily: "var(--body)", fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>{c.title}</p>
            </Link>
            {c.addOn && (
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Add-on, not part of the <span style={{ whiteSpace: "nowrap" }}>3-pack</span></p>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
              <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 14 }}>{c.price}</span>
              <form action={addToCart}>
                <input type="hidden" name="variantId" value={c.variantId} />
                <input type="hidden" name="quantity" value="1" />
                <button type="submit" className="candy-btn" style={{ padding: "6px 14px", fontSize: 13 }} aria-label={`Add ${c.title} to bag`}>
                  Add
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
