// Web Storefront client. The fetch core is the shared, platform-neutral factory
// in @nailismo/shopify; here we bind it to the web's server env and Next.js
// fetch caching (route-segment revalidate). Prefers the private token, falling
// back to the public one — matching the original web behavior.
import { createStorefrontFetch, ShopifyConfigError } from "@nailismo/shopify/client";

export { ShopifyConfigError };

export const storefrontFetch = createStorefrontFetch({
  domain: process.env.SHOPIFY_STORE_DOMAIN,
  apiVersion: process.env.SHOPIFY_API_VERSION ?? "2025-01",
  privateToken: process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
  publicToken: process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN,
  buildInit: (options) => {
    const noCache = options.revalidate === 0;
    return noCache
      ? { cache: "no-store" }
      : { next: { revalidate: options.revalidate ?? 60 } };
  },
});
