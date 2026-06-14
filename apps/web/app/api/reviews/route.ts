// Reviews BFF for the native iOS client. The web PDP fetches Judge.me reviews
// server-side in its RSC (apps/web/app/products/[handle]/judgeme.ts) because the
// Judge.me private token must never reach a client. The iOS app can't hold that
// token either, so it reads reviews through this endpoint instead — the same
// pattern as /api/scan. Returns the shared Review[] shape plus the aggregate the
// app needs for the star summary.
//
// GET /api/reviews?productId=gid://shopify/Product/123   (numeric id also works)

import { fetchProductReviews } from "@/app/products/[handle]/judgeme";
import { aggregate } from "@/app/products/[handle]/reviews";

export const runtime = "nodejs";
// Reuse the hourly fetch cache inside fetchProductReviews; no need to recompute
// per request.
export const revalidate = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId")?.trim();
  if (!productId) {
    return Response.json({ error: "Missing productId" }, { status: 400 });
  }

  // fetchProductReviews accepts a gid and extracts the numeric id; a bare
  // numeric id passes through the same regex unchanged.
  const reviews = await fetchProductReviews(productId);
  const agg = aggregate(reviews);

  return Response.json(
    { reviews, aggregate: agg },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
