import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCT_BY_HANDLE_QUERY, PRODUCT_HANDLES_QUERY } from "@/lib/shopify/queries";
import type {
  ProductByHandleQueryResult,
  ProductHandlesQueryResult,
  ShopifyProductDetail,
  ShopifyVariant,
} from "@/lib/shopify/types";
import { Header } from "@/app/components/Header";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Footer } from "@/app/components/Footer";
import { ProductGallery } from "./ProductGallery";
import { PurchasePanel } from "./PurchasePanel";

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

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper sec relative overflow-hidden">
        <div className="nail-container">
          <nav className="mb-8 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
            <Link href="/" className="ulink">Home</Link>
            <span>/</span>
            <Link href="/#most-wanted" className="ulink">Shop</Link>
            <span>/</span>
            <span className="text-tetsu">{product.title}</span>
          </nav>

          <div className="grid grid-cols-12 gap-6 md:gap-12 items-start">
            <div className="col-span-12 lg:col-span-7">
              <ProductGallery images={images} title={product.title} />
            </div>

            <div className="col-span-12 lg:col-span-5 lg:sticky lg:top-24">
              <div className="flex items-center gap-3 mb-6">
                <span className="cap">N°{product.handle.slice(0, 2).toUpperCase()}</span>
                <span className="cap">{product.productType || "Press-On Set"}</span>
              </div>

              <h1 className="font-display font-light tracking-display leading-[0.95] text-[clamp(36px,5vw,72px)]">
                {product.title}
                <span className="text-akane">.</span>
              </h1>

              <PurchasePanel
                options={product.options}
                variants={variants}
                defaultVariantId={defaultVariant?.id ?? null}
              />

              {product.tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-rikyu">
                  {product.tags.slice(0, 8).map((t) => (
                    <span key={t} className="px-2 py-1 border border-hair">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {product.descriptionHtml && (
                <div className="mt-10 pt-8 border-t border-hair">
                  <span className="cap mb-4 block">Details</span>
                  <div
                    className="text-[15px] text-rikyu leading-relaxed [&_p]:mb-3 [&_strong]:text-tetsu [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                  />
                </div>
              )}

              <div className="mt-10 pt-6 border-t border-hair grid grid-cols-2 gap-px bg-[var(--hair)] border border-hair">
                <div className="bg-paper p-4 text-[12px]">
                  <span className="cap mb-1 block">Wear</span>
                  Tabs + liquid adhesive
                </div>
                <div className="bg-paper p-4 text-[12px]">
                  <span className="cap mb-1 block">Sizes</span>
                  24 per set
                </div>
                <div className="bg-paper p-4 text-[12px]">
                  <span className="cap mb-1 block">Vendor</span>
                  {product.vendor || "Nailismo"}
                </div>
                <div className="bg-paper p-4 text-[12px]">
                  <span className="cap mb-1 block">SKU</span>
                  NLS-{product.handle.slice(0, 6).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
