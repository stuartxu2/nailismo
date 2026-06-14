// Pure parse + aggregate for PDP reviews. No React, no I/O — unit-testable.
// Reviews originate from a Shopify `custom.reviews` JSON metafield; this module
// is deliberately tolerant so a malformed metafield degrades to the (safe) zero
// state instead of throwing during a server render.

export type Review = {
  author: string;
  rating: number; // integer 1..5
  title?: string;
  body: string;
  date: string; // YYYY-MM-DD -> datePublished
  verified?: boolean;
  incentivized?: boolean;
};

export function parseReviews(value: string | null | undefined): Review[] {
  if (!value) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const out: Review[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const author = typeof o.author === "string" ? o.author.trim() : "";
    const body = typeof o.body === "string" ? o.body.trim() : "";
    const date = typeof o.date === "string" ? o.date.trim() : "";
    const rating = typeof o.rating === "number" ? Math.round(o.rating) : NaN;

    if (!author || !body || !date) continue;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    out.push({
      author,
      rating,
      body,
      date,
      title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : undefined,
      verified: o.verified === true,
      incentivized: o.incentivized === true,
    });
  }
  return out;
}

export function aggregate(
  reviews: Review[],
): { ratingValue: number; reviewCount: number } | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const ratingValue = Math.round((sum / reviews.length) * 10) / 10;
  return { ratingValue, reviewCount: reviews.length };
}
