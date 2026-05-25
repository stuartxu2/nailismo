import { AnnouncementTicker } from "./components/AnnouncementTicker";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { StarterGateway, STARTER_HANDLES } from "./components/StarterGateway";
import { Featured } from "./components/Featured";
import { Fit } from "./components/Fit";
import { Application } from "./components/Application";
import { MostWanted } from "./components/MostWanted";
import { Lookbook } from "./components/Lookbook";
import { SocialProof } from "./components/SocialProof";
import { Faq } from "./components/Faq";
import { FinalCta } from "./components/FinalCta";
import { Newsletter } from "./components/Newsletter";
import { Footer } from "./components/Footer";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { SHOP_QUERY, PRODUCTS_QUERY } from "@/lib/shopify/queries";
import type {
  ShopQueryResult,
  ProductsQueryResult,
  ShopifyProduct,
} from "@/lib/shopify/types";

async function probeShopify(): Promise<string | null> {
  try {
    const data = await storefrontFetch<ShopQueryResult>(SHOP_QUERY, {}, { revalidate: 300 });
    return data.shop.name;
  } catch (err) {
    if (err instanceof ShopifyConfigError) {
      console.warn("[shopify] config missing — skipping shop probe");
    } else {
      console.error("[shopify] shop probe failed:", err);
    }
    return null;
  }
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  try {
    const data = await storefrontFetch<ProductsQueryResult>(PRODUCTS_QUERY, { first: 50 });
    return data.products.nodes;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] products fetch failed:", err);
    }
    return [];
  }
}

function pickByHandles(all: ShopifyProduct[], handles: readonly string[]): ShopifyProduct[] {
  const byHandle = new Map(all.map((p) => [p.handle, p]));
  return handles.map((h) => byHandle.get(h)).filter((p): p is ShopifyProduct => Boolean(p));
}

export default async function Home() {
  const [shopName, allProducts] = await Promise.all([probeShopify(), fetchAllProducts()]);
  if (shopName) {
    console.info(`[shopify] connected to shop: ${shopName} (${allProducts.length} products)`);
  }

  const mostWanted = allProducts.slice(0, 4);
  const starterProducts = pickByHandles(allProducts, STARTER_HANDLES);

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <Hero />
      {/* 02 — New arrivals */}
      <MostWanted products={mostWanted} />
      {/* 03 — Best for first-time users */}
      <StarterGateway products={starterProducts} />
      <Featured />
      {/* 04 — Fit & sizing */}
      <Fit />
      <Application />
      {/* 05 — Lookbook */}
      <Lookbook />
      {/* 06 + 07 — Creator clips & reviews */}
      <SocialProof />
      {/* 08 — Checkout & shipping reassurance */}
      <FinalCta />
      <Faq />
      <Newsletter />
      <Footer />
    </>
  );
}
