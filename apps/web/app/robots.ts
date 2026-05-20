import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://nailismo.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/account", "/search", "/api/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
