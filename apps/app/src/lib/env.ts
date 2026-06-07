// Expo inlines process.env.EXPO_PUBLIC_* at build time. These mirror the public,
// client-safe Storefront credentials from apps/web/.env.local (see apps/app/.env).
export const shopifyEnv = {
  domain: process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN,
  publicToken: process.env.EXPO_PUBLIC_SHOPIFY_PUBLIC_TOKEN,
  apiVersion: process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION ?? "2026-01",
} as const;

// Base origin of the Next.js app that hosts the /api/scan vision endpoint.
// Dev: a LAN URL to the local web server (e.g. http://192.168.x.x:3000).
// Prod: the live site. Falls back to production so release builds work.
export const scanEnv = {
  apiBase: process.env.EXPO_PUBLIC_SCAN_API_URL ?? "https://nailismo.com",
} as const;
