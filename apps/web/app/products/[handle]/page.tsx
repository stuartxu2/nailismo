import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import {
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_HANDLES_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from "@/lib/shopify/queries";
import type {
  ProductByHandleQueryResult,
  ProductHandlesQueryResult,
  ProductRecommendationsQueryResult,
  ShopifyImage,
  ShopifyMediaNode,
  ShopifyProduct,
  ShopifyProductDetail,
  ShopifyVariant,
} from "@/lib/shopify/types";
import { ProductGallery, type GalleryItem } from "./ProductGallery";
import { PurchasePanel } from "./PurchasePanel";
import { ProductFaq } from "./ProductFaq";
import { ProductReviews } from "./ProductReviews";
import { PressOnSteps } from "./PressOnSteps";
import { RelatedProducts } from "./RelatedProducts";
import { SimpleProductTemplate } from "./SimpleProductTemplate";
import { classifyProduct } from "@/lib/shopify/product-class";
import { parseReviews, aggregate } from "./reviews";
import { fetchProductReviews } from "./judgeme";
import { UgcStrip } from "@/app/components/UgcStrip";

type Params = { handle: string };

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const data = await storefrontFetch<ProductHandlesQueryResult>(
      PRODUCT_HANDLES_QUERY,
      { first: 50 },
      { revalidate: 300 },
    );
    return data.products.nodes.map((n) => ({ handle: n.handle }));
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] generateStaticParams failed:", err);
    }
    return [];
  }
}

async function fetchRecommendations(productId: string): Promise<ShopifyProduct[]> {
  try {
    const data = await storefrontFetch<ProductRecommendationsQueryResult>(
      PRODUCT_RECOMMENDATIONS_QUERY,
      { productId },
      { revalidate: 600 },
    );
    return data.productRecommendations ?? [];
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error(`[shopify] recommendations fetch failed for ${productId}:`, err);
    }
    return [];
  }
}

async function fetchProduct(handle: string): Promise<ShopifyProductDetail | null> {
  try {
    const data = await storefrontFetch<ProductByHandleQueryResult>(
      PRODUCT_BY_HANDLE_QUERY,
      { handle },
      { revalidate: 120 },
    );
    return data.product;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error(`[shopify] product fetch failed for ${handle}:`, err);
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
  const product = await fetchProduct(handle);
  if (!product) return { title: "Product Not Found · Nailismo" };
  const description = product.descriptionHtml.replace(/<[^>]+>/g, "").slice(0, 160);
  // Inject the primary keyword into the title for nail sets (skip gift cards /
  // care essentials, where "Press-On Nails" would misdescribe the product).
  const cls = classifyProduct({ handle: product.handle, isGiftCard: product.isGiftCard });
  const titleBase = cls === "nail" ? `${product.title} — Press-On Nails` : product.title;
  return {
    title: `${titleBase} · Nailismo`,
    description,
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      title: `${titleBase} · Nailismo`,
      description,
      type: "website",
      images: product.featuredImage ? [{ url: product.featuredImage.url }] : undefined,
    },
  };
}

function pickDefaultVariant(variants: ShopifyVariant[]): ShopifyVariant | undefined {
  return variants.find((v) => v.availableForSale) ?? variants[0];
}

// Normalize Shopify product media (images + native/external video) into the
// gallery's item list, preserving editorial order. Falls back to the plain
// images list for products that have no `media` (older catalog entries).
function buildGalleryItems(
  media: ShopifyMediaNode[] | undefined,
  images: ShopifyImage[],
): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const m of media ?? []) {
    if (m.mediaContentType === "IMAGE" && m.image?.url) {
      items.push({ kind: "image", url: m.image.url, altText: m.image.altText ?? m.alt });
    } else if (m.mediaContentType === "VIDEO" && m.sources?.length) {
      const mp4 = m.sources.filter((s) => s.mimeType === "video/mp4");
      // Order mp4 renditions so the one closest to 720p plays first.
      const ordered = (mp4.length ? mp4 : m.sources)
        .slice()
        .sort((a, b) => Math.abs((a.height ?? 720) - 720) - Math.abs((b.height ?? 720) - 720))
        .map((s) => ({ url: s.url, type: s.mimeType }));
      if (ordered.length) {
        items.push({ kind: "video", sources: ordered, poster: m.previewImage?.url ?? null, altText: m.previewImage?.altText ?? m.alt });
      }
    } else if (m.mediaContentType === "EXTERNAL_VIDEO" && m.embedUrl) {
      items.push({ kind: "embed", embedUrl: m.embedUrl, poster: m.previewImage?.url ?? null, altText: m.previewImage?.altText ?? m.alt });
    }
  }
  if (items.length) return items;
  return images.map((img) => ({ kind: "image", url: img.url, altText: img.altText }));
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  if (!product) notFound();

  const variants = product.variants.nodes;
  const defaultVariant = pickDefaultVariant(variants);


  const images =
    product.images.nodes.length > 0
      ? product.images.nodes
      : product.featuredImage
        ? [{ url: product.featuredImage.url, altText: product.featuredImage.altText, width: null, height: null }]
        : [];

  const galleryItems = buildGalleryItems(product.media?.nodes, images);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";
  const productUrl = `${siteUrl}/products/${product.handle}`;
  const price = defaultVariant?.price ?? product.priceRange.minVariantPrice;
  // Judge.me is the live review source; fall back to the seeded `custom.reviews`
  // metafield if Judge.me returns nothing (e.g. before any review is published).
  const [judgemeReviews, recommendations] = await Promise.all([
    fetchProductReviews(product.id),
    fetchRecommendations(product.id),
  ]);
  const reviews = judgemeReviews.length
    ? judgemeReviews
    : parseReviews(product.reviews?.value);
  const reviewAgg = aggregate(reviews);
  const productNode: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.descriptionHtml.replace(/<[^>]+>/g, "").slice(0, 5000),
    image: images.map((i) => i.url),
    brand: { "@type": "Brand", name: product.vendor || "Nailismo" },
    offers: {
      "@type": "Offer",
      price: Number(price.amount).toFixed(2),
      priceCurrency: price.currencyCode,
      // ~1 year out so the offer never reads as stale; refreshes on each ISR build.
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: productUrl,
      // Mirrors /policies/returns: 30 days from delivery, US, return by mail.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 30,
        returnMethod: "https://schema.org/ReturnByMail",
      },
    },
  };

  if (reviewAgg) {
    productNode.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewAgg.ratingValue,
      reviewCount: reviewAgg.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
    productNode.review = reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      reviewBody: r.body,
      datePublished: r.date,
      ...(r.title ? { name: r.title } : {}),
    }));
  }

  const jsonLd = [
    productNode,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
        { "@type": "ListItem", position: 3, name: product.title, item: productUrl },
      ],
    },
  ];

  const jsonLdScripts = jsonLd.map((schema, i) => (
    <script
      key={i}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  ));

  // Gift cards + care essentials render the leaner template; nail sets keep the
  // full product page below.
  const productClass = classifyProduct(product);
  if (productClass !== "nail") {
    return (
      <>
        {jsonLdScripts}
        <SimpleProductTemplate
          product={product}
          galleryItems={galleryItems}
          defaultVariantId={defaultVariant?.id ?? null}
          reviews={reviews}
          recommendations={recommendations}
          kind={productClass}
        />
      </>
    );
  }

  return (
    <>
      {jsonLdScripts}
      <main className="candy-wrap candy-sec" style={{ paddingTop: 28 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <Link href="/shop" className="candy-crumb">Shop</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>{product.title}</span>
        </nav>

        <div className="grid grid-cols-12 gap-6 md:gap-12 items-start">
          <div className="col-span-12 lg:col-span-7">
            <ProductGallery items={galleryItems} title={product.title} />
            <PressOnSteps />
          </div>

          <div className="col-span-12 lg:col-span-5 lg:sticky lg:top-24">
            <span className="candy-eyebrow">{product.productType || "Press-On Set"}</span>
            <h1 style={{ marginTop: 10, fontSize: "clamp(36px,5vw,68px)" }}>{product.title}</h1>

            <PurchasePanel
              options={product.options}
              variants={variants}
              defaultVariantId={defaultVariant?.id ?? null}
            />

            {product.tags.length > 0 && (
              <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {product.tags.slice(0, 8).map((t) => (
                  <span key={t} className="candy-chip" style={{ cursor: "default" }}>{t}</span>
                ))}
              </div>
            )}

            {product.descriptionHtml && (
              <div style={{ marginTop: 32 }}>
                <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Details</span>
                <div className="candy-prose" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
              </div>
            )}

            <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { k: "Wears", v: "Up to 7 days" },
                { k: "On in", v: "Minutes" },
                { k: "In the box", v: "10 nails + toolkit" },
                { k: "Removal", v: "Clean & easy" },
              ].map((c) => (
                <div key={c.k} style={{ background: "var(--cream)", border: "1px solid var(--marshmallow)", borderRadius: 18, padding: "14px 16px", boxShadow: "var(--shadow-candy)" }}>
                  <span className="candy-eyebrow" style={{ fontSize: 11 }}>{c.k}</span>
                  <p style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 16, marginTop: 4 }}>{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <RelatedProducts products={recommendations} />

        <ProductFaq title={product.title} productType={product.productType} />

        <ProductReviews reviews={reviews} productTitle={product.title} />

        <div style={{ marginTop: 56 }}>
          <UgcStrip />
        </div>
      </main>
      {/* clearance so the mobile sticky Add-to-Bag bar never covers the footer */}
      <div aria-hidden className="md:hidden" style={{ height: 84 }} />
    </>
  );
}
