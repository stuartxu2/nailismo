import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCT_BY_HANDLE_QUERY, PRODUCT_HANDLES_QUERY } from "@/lib/shopify/queries";
import type {
  ProductByHandleQueryResult,
  ProductHandlesQueryResult,
  ShopifyImage,
  ShopifyMediaNode,
  ShopifyProductDetail,
  ShopifyVariant,
} from "@/lib/shopify/types";
import { Header } from "@/app/components/Header";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Footer } from "@/app/components/Footer";
import { ProductGallery, type GalleryItem } from "./ProductGallery";
import { PurchasePanel } from "./PurchasePanel";
import { ProductFaq } from "./ProductFaq";
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
  return {
    title: `${product.title} · Nailismo`,
    description,
    alternates: { canonical: `/product/${product.handle}` },
    openGraph: {
      title: `${product.title} · Nailismo`,
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
  const productUrl = `${siteUrl}/product/${product.handle}`;
  const price = defaultVariant?.price ?? product.priceRange.minVariantPrice;
  const jsonLd = [
    {
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
        availability: product.availableForSale
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: productUrl,
      },
    },
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

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <AnnouncementTicker />
      <Header />
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
                <div key={c.k} style={{ background: "var(--cream)", border: "2.5px solid var(--ink)", borderRadius: 18, padding: "14px 16px", boxShadow: "var(--shadow-candy)" }}>
                  <span className="candy-eyebrow" style={{ fontSize: 11 }}>{c.k}</span>
                  <p style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 16, marginTop: 4 }}>{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ProductFaq title={product.title} productType={product.productType} />

        <div style={{ marginTop: 56 }}>
          <UgcStrip />
        </div>
      </main>
      <Footer />
      {/* clearance so the mobile sticky Add-to-Bag bar never covers the footer */}
      <div aria-hidden className="md:hidden" style={{ height: 84 }} />
    </>
  );
}
