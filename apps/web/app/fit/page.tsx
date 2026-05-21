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
    "An interactive fit guide for first-time wearers. Calibrate with any bank card, measure each nail on screen, and get your exact 0–9 size map — no ruler, no guesswork.",
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
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0 relative">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <Link href="/" className="ulink">
                Home
              </Link>
              <span aria-hidden>/</span>
              <span className="text-tetsu">Fit Guide</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 md:gap-12 items-end">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°06</span>
                  <span className="cap">Fit System · Interactive</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(44px,7vw,104px)]">
                  Find your
                  <br />
                  <span className="italic font-serif font-light">exact fit</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">
                  No ruler. No guesswork. Calibrate the screen with any bank card,
                  measure each nail with your finger, and walk away with a size
                  map built for your hands.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="edit-pill">~90 Seconds</span>
                  <span className="edit-pill">0–9 Scale</span>
                  <span className="edit-pill">Saved On Device</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FitGuide products={starters} />
      </main>
      <Footer />
    </>
  );
}
