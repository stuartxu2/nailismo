/**
 * Platform-neutral Shopify Storefront client factory.
 *
 * The original web client read process.env and baked in Next.js fetch caching.
 * That doesn't port to React Native (different env mechanism, no `next` fetch
 * option). So the core is a factory: each app supplies its own config + a
 * `buildInit` hook for platform caching. Web passes server env + Next revalidate
 * options; mobile passes the PUBLIC token + plain fetch.
 */

export class ShopifyConfigError extends Error {}

export type StorefrontFetchOptions = {
  /** 0 = no cache; >0 = seconds (web/Next ISR). Platforms may interpret freely. */
  revalidate?: number;
};

export type StorefrontConfig = {
  domain?: string;
  apiVersion?: string;
  /** Server-only private token (preferred where available). */
  privateToken?: string;
  /** Public, client-safe Storefront token (used by mobile). */
  publicToken?: string;
  /** Produce platform-specific fetch init from the per-request options. */
  buildInit?: (options: StorefrontFetchOptions) => RequestInit;
};

export type StorefrontFetch = <T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: StorefrontFetchOptions,
) => Promise<T>;

export function createStorefrontFetch(config: StorefrontConfig): StorefrontFetch {
  const { domain, apiVersion = "2025-01", privateToken, publicToken, buildInit } = config;

  return async function storefrontFetch<T>(
    query: string,
    variables: Record<string, unknown> = {},
    options: StorefrontFetchOptions = {},
  ): Promise<T> {
    if (!domain || (!privateToken && !publicToken)) {
      throw new ShopifyConfigError(
        "Missing Shopify store domain or Storefront token.",
      );
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (privateToken) {
      headers["Shopify-Storefront-Private-Token"] = privateToken;
    } else if (publicToken) {
      headers["X-Shopify-Storefront-Access-Token"] = publicToken;
    }

    const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      ...(buildInit ? buildInit(options) : {}),
    });

    if (!res.ok) {
      throw new Error(`Shopify Storefront API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (json.errors?.length) {
      throw new Error(`Shopify GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
    }
    if (!json.data) {
      throw new Error("Shopify response missing data");
    }
    return json.data;
  };
}
