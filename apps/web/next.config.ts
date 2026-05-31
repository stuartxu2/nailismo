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
};

export default nextConfig;
