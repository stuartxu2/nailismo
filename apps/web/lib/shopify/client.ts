const domain = process.env.SHOPIFY_STORE_DOMAIN;
const privateToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
const publicToken = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
const version = process.env.SHOPIFY_API_VERSION ?? "2025-01";

export class ShopifyConfigError extends Error {}

export async function storefrontFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: { revalidate?: number } = {},
): Promise<T> {
  if (!domain || (!privateToken && !publicToken)) {
    throw new ShopifyConfigError(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_{PRIVATE,PUBLIC}_TOKEN in environment.",
    );
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (privateToken) {
    headers["Shopify-Storefront-Private-Token"] = privateToken;
  } else if (publicToken) {
    headers["X-Shopify-Storefront-Access-Token"] = publicToken;
  }

  const noCache = options.revalidate === 0;
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    ...(noCache
      ? { cache: "no-store" as const }
      : { next: { revalidate: options.revalidate ?? 60 } }),
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
}
