import { AnnouncementTicker } from "./components/AnnouncementTicker";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { StarterGateway, STARTER_HANDLES } from "./components/StarterGateway";
import { CulturalAnchor } from "./components/CulturalAnchor";
import { Edits, type EditGroup, type EditKey } from "./components/Edits";
import { Featured } from "./components/Featured";
import { Fit } from "./components/Fit";
import { Application } from "./components/Application";
import { MostWanted } from "./components/MostWanted";
import { Lookbook } from "./components/Lookbook";
import { Bundle } from "./components/Bundle";
import { TasteEducation } from "./components/TasteEducation";
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

const EDIT_HANDLES: Record<EditKey, string[]> = {
  stealth: ["concrete-clarity", "bold-horizon", "ocean-drive", "safari-stripes"],
  architectural: [
    "monochrome-edge",
    "midnight-circuit",
    "crimson-impact-red-silver-graphic-press-on-nails-for-men",
    "crimson-authority",
  ],
  "high-signal": [
    "liquid-metal",
    "rebel-king",
    "liquid-ice",
    "galaxy-glitch",
  ],
};

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
  const editKeys = Object.keys(EDIT_HANDLES) as EditKey[];
  const editGroups: EditGroup[] = editKeys.map((key) => ({
    key,
    products: pickByHandles(allProducts, EDIT_HANDLES[key]),
  }));

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <Hero />
      <StarterGateway products={starterProducts} />
      <CulturalAnchor />
      <Edits groups={editGroups} />
      <Featured />
      <Fit />
      <Application />
      <MostWanted products={mostWanted} />
      <Lookbook />
      <Bundle />
      <TasteEducation />
      <SocialProof />
      <Faq />
      <FinalCta />
      <Newsletter />
      <Footer />
    </>
  );
}
