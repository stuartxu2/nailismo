import Link from "next/link";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCTS_QUERY } from "@/lib/shopify/queries";
import type { ProductsQueryResult, ShopifyProduct } from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { STARTER_HANDLES } from "@/app/components/StarterGateway";
import { FitGuide } from "./FitGuide";

export const metadata: Metadata = {
  title: "Find Your Fit · Nailismo",
  description:
    "An interactive fit guide for first-time wearers. Calibrate with any bank card, measure each nail on screen, and get your exact S–XL set size — no ruler, no guesswork.",
  alternates: { canonical: "/fit" },
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
      console.error("[shopify] fit-guide product fetch failed:", err);
    }
    return [];
  }
}

function pickByHandles(
  all: ShopifyProduct[],
  handles: readonly string[],
): ShopifyProduct[] {
  const byHandle = new Map(all.map((p) => [p.handle, p]));
  return handles
    .map((h) => byHandle.get(h))
    .filter((p): p is ShopifyProduct => Boolean(p));
}

export default async function FitPage() {
  const all = await fetchProducts();
  const starters = pickByHandles(all, STARTER_HANDLES);

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main>
        <section className="candy-wrap" style={{ paddingTop: 36 }}>
          <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Link href="/" className="candy-crumb">Home</Link>
            <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Fit Guide</span>
          </nav>

          <div className="candy-pagehead">
            <span className="candy-eyebrow">Find my size</span>
            <h1 style={{ marginTop: 10 }}>Find your exact fit</h1>
            <p>
              No ruler, no guesswork. Calibrate with any bank card, measure each nail
              on screen, and get your S–XL set size in about a minute.
            </p>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="candy-chip" style={{ cursor: "default" }}>~90 seconds</span>
              <span className="candy-chip" style={{ cursor: "default" }}>S–XL sizing</span>
              <span className="candy-chip" style={{ cursor: "default" }}>Saved on device</span>
            </div>
          </div>
        </section>

        <FitGuide products={starters} />
      </main>
      <Footer />
    </>
  );
}
