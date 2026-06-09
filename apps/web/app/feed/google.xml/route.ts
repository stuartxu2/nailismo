import { buildGoogleMerchantFeed } from "@/lib/feed/google-merchant-feed";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCTS_FEED_QUERY } from "@/lib/shopify/queries";
import type { ProductsFeedQueryResult } from "@/lib/shopify/types";

export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com").replace(
  /\/$/,
  "",
);

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

export async function GET(): Promise<Response> {
  try {
    const data = await storefrontFetch<ProductsFeedQueryResult>(
      PRODUCTS_FEED_QUERY,
      { first: 250 },
      { revalidate },
    );

    return xmlResponse(buildGoogleMerchantFeed(data.products.nodes, SITE_URL));
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[feed/google.xml] product feed fetch failed:", err);
    }

    return xmlResponse(buildGoogleMerchantFeed([], SITE_URL));
  }
}
