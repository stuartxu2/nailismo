// Server-only Judge.me reviews source. Pulls published reviews from the Judge.me
// REST API and maps them into the shared `Review` shape, so the PDP review cards
// and AggregateRating/Review schema (originally built for the `custom.reviews`
// metafield) render unchanged. The private API token is read from the server
// environment only (JUDGEME_PRIVATE_TOKEN) and never reaches the client bundle.
//
// Reviews are fetched once per hour (route fetch cache, revalidate 3600) for the
// whole shop and grouped by Shopify product id, so adding reviews to more PDPs
// does not add API calls.

import type { Review } from "./reviews";

const JM_API = "https://judge.me/api/v1";
type JudgemeRaw = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// gid://shopify/Product/123456 -> "123456"
function numericProductId(gid: string): string | null {
  const m = /(\d+)\s*$/.exec(gid);
  return m ? m[1] : null;
}

function matchesProduct(o: JudgemeRaw, numericId: string): boolean {
  const ext = o.product_external_id;
  if (typeof ext === "number") return String(ext) === numericId;
  if (typeof ext === "string") return ext === numericId;
  return false;
}

// Pure: map raw Judge.me review objects to the shared Review type. Deliberately
// tolerant — hidden/unpublished/malformed entries are dropped rather than
// throwing during a server render. Mirrors the safety posture of parseReviews.
export function mapJudgemeReviews(raw: unknown): Review[] {
  if (!Array.isArray(raw)) return [];

  const out: Review[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as JudgemeRaw;

    // Only publicly visible reviews.
    if (o.published === false || o.hidden === true) continue;
    if (typeof o.curated === "string" && o.curated === "spam") continue;

    const rating = typeof o.rating === "number" ? Math.round(o.rating) : NaN;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    const body = str(o.body);
    if (!body) continue;

    const created = str(o.created_at);
    const date = created ? created.slice(0, 10) : "";
    if (!date) continue;

    const reviewer =
      o.reviewer && typeof o.reviewer === "object" ? (o.reviewer as JudgemeRaw) : {};
    const author = str(reviewer.name) || "Verified Buyer";

    // Judge.me marks buyer-verified reviews with verified === "buyer".
    const verified =
      o.verified === true ||
      (typeof o.verified === "string" && o.verified !== "" && o.verified !== "no");

    out.push({
      author,
      rating,
      body,
      date,
      title: str(o.title) || undefined,
      verified,
    });
  }
  return out;
}

async function fetchAllReviews(): Promise<JudgemeRaw[]> {
  const token = process.env.JUDGEME_PRIVATE_TOKEN;
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  if (!token || !shop) return [];

  const perPage = 10; // Judge.me caps /reviews per_page at 10.
  const all: JudgemeRaw[] = [];

  for (let page = 1; page <= 50; page++) {
    const url =
      `${JM_API}/reviews?api_token=${encodeURIComponent(token)}` +
      `&shop_domain=${encodeURIComponent(shop)}&per_page=${perPage}&page=${page}`;
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) {
        console.error(`[judgeme] reviews fetch HTTP ${res.status}`);
        break;
      }
      const json = (await res.json()) as { reviews?: unknown };
      const batch = Array.isArray(json.reviews) ? (json.reviews as JudgemeRaw[]) : [];
      if (batch.length === 0) break; // empty page = end of list
      all.push(...batch);
    } catch (err) {
      console.error("[judgeme] reviews fetch failed:", err);
      break;
    }
  }
  return all;
}

// Server-only: published reviews for one product, mapped to the shared Review
// shape. Returns [] on missing config or API failure so the PDP degrades to the
// no-reviews state instead of erroring.
export async function fetchProductReviews(productGid: string): Promise<Review[]> {
  const numericId = numericProductId(productGid);
  if (!numericId) return [];
  const all = await fetchAllReviews();
  return mapJudgemeReviews(all.filter((o) => matchesProduct(o, numericId)));
}
