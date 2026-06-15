// Server-only Shopify Admin GraphQL client.
//
// Shopify removed static admin tokens; we exchange CLIENT_ID/SECRET for a
// short-lived (~24h) Admin API token via the client-credentials grant — the TS
// runtime counterpart of tools/shopify_auth.py. The token is cached in module
// scope (warm serverless instances reuse it; cold starts refetch) rather than on
// disk, since serverless filesystems are ephemeral/read-only.
//
// NEVER import this from a Client Component — it reads the admin secret. NEVER
// log the token or secret values; surface key NAMES only (per CLAUDE.md).

export class ShopifyAdminConfigError extends Error {}

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;

// Refetch this many ms before the real expiry to avoid edge-of-expiry 401s.
const EXPIRY_BUFFER_MS = 5 * 60_000;

let cached: { token: string; expiresAt: number } | null = null;

async function getAdminToken(): Promise<string> {
  if (!DOMAIN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new ShopifyAdminConfigError(
      "Missing SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_CLIENT_ID / SHOPIFY_ADMIN_CLIENT_SECRET",
    );
  }
  if (cached && cached.expiresAt - Date.now() > EXPIRY_BUFFER_MS) {
    return cached.token;
  }
  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Never echo the request body (contains the secret); status only.
    throw new Error(`Shopify Admin token fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("Shopify Admin token: no access_token in response");
  }
  const expiresIn = json.expires_in ?? 86_400;
  cached = { token: json.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return cached.token;
}

/** Execute a GraphQL operation against the Admin API. Server-only. */
export async function adminFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  if (!DOMAIN) throw new ShopifyAdminConfigError("Missing SHOPIFY_STORE_DOMAIN");
  const token = await getAdminToken();
  const res = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`Shopify Admin API error: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) {
    throw new Error(
      `Shopify Admin GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }
  if (!json.data) throw new Error("Shopify Admin response missing data");
  return json.data;
}
