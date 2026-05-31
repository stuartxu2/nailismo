// Mobile Storefront client. Uses the PUBLIC token (private token is server-only
// and never bundled). Plain fetch, no Next caching; an in-memory layer can be
// added later if needed. Re-exports the shared queries/types so screens import
// everything Shopify from one place.
import { createStorefrontFetch } from "@nailismo/shopify";
import { shopifyEnv } from "./env";

export const storefrontFetch = createStorefrontFetch({
  domain: shopifyEnv.domain,
  apiVersion: shopifyEnv.apiVersion,
  publicToken: shopifyEnv.publicToken,
});

export * from "@nailismo/shopify";
