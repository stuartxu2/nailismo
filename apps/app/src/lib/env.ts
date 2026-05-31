// Expo inlines process.env.EXPO_PUBLIC_* at build time. These mirror the public,
// client-safe Storefront credentials from apps/web/.env.local (see apps/app/.env).
export const shopifyEnv = {
  domain: process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN,
  publicToken: process.env.EXPO_PUBLIC_SHOPIFY_PUBLIC_TOKEN,
  apiVersion: process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION ?? "2026-01",
} as const;
