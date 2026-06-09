import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Shared workspace packages ship raw TypeScript — Next must transpile them.
  transpilePackages: ["@nailismo/shopify", "@nailismo/fit-sizing", "@nailismo/theme"],
  turbopack: {
    // Point at the monorepo root so Turbopack can follow the @nailismo/*
    // symlinks in node_modules out to ../../packages/*.
    root: path.resolve(__dirname, "../.."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
    ],
  },
  // The nav label is "Sets" but the catalog lives at /shop. Catch any stale
  // bookmark, ad, or SEO link to /sets (308) so it never dead-ends on a 404.
  // Product detail pages moved /product/:handle -> /products/:handle; the 308
  // preserves SEO equity and keeps already-indexed links + Google Merchant feed
  // URLs alive while Google recrawls the new path.
  async redirects() {
    return [
      { source: "/sets", destination: "/shop", permanent: true },
      { source: "/sets/:path*", destination: "/shop", permanent: true },
      { source: "/product/:handle", destination: "/products/:handle", permanent: true },
    ];
  },
};

export default nextConfig;
