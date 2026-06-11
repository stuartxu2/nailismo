import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { COLLECTIONS_QUERY } from "@/lib/shopify/queries";
import type { CollectionsQueryResult, ShopifyCollectionCard } from "@/lib/shopify/types";

// Exactly the Shopify collections that appear in menus, in display order.
// Everything else (single-color smart collections, featured-products, wairo)
// deliberately stays out. Add a handle here to surface a new collection.
const MENU_COLLECTION_HANDLES = [
  "new-drops",
  "best-sellers",
  "the-essentials",
  "seasonal-surge",
  "night-out-bold",
  "weekend-warrior",
  "festive-armor",
  "everyday-edge",
];

// Menu collections synced from Shopify (titles, existence) — shared by the
// header dropdown, the footer, and the /shop collection shelf so they never
// drift. A collection deleted in Shopify simply drops out of the menus.
export async function getMenuCollections(): Promise<ShopifyCollectionCard[]> {
  try {
    const data = await storefrontFetch<CollectionsQueryResult>(
      COLLECTIONS_QUERY,
      { first: 50 },
      { revalidate: 300 },
    );
    const byHandle = new Map(data.collections.nodes.map((c) => [c.handle, c]));
    return MENU_COLLECTION_HANDLES.flatMap((h) => byHandle.get(h) ?? []);
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] collections fetch failed:", err);
    }
    return [];
  }
}
