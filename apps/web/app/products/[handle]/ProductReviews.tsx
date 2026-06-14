// Visible PDP review section. Renders nothing when there are no reviews, so the
// PDP shows a review block only when genuine reviews exist in the metafield.
// The matching AggregateRating/Review schema is emitted in page.tsx from the
// same parsed array.
import type { Review } from "./reviews";
import { aggregate } from "./reviews";

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="candy-stars" aria-label={`${rating} out of 5 stars`}>
      {"★★★★★".slice(0, full)}
      {"☆☆☆☆☆".slice(0, 5 - full)}
    </span>
  );
}

export function ProductReviews({
  reviews,
  productTitle,
}: {
  reviews: Review[];
  productTitle: string;
}) {
  const agg = aggregate(reviews);
  if (!agg) return null;

  return (
    <section style={{ marginTop: 56 }}>
      <span className="candy-eyebrow">Reviews</span>
      <h2 style={{ fontSize: "clamp(28px,4vw,48px)", marginTop: 10, marginBottom: 8 }}>
        What buyers say
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Stars rating={agg.ratingValue} />
        <span style={{ fontFamily: "var(--body)", fontWeight: 800 }}>
          {agg.ratingValue.toFixed(1)} · {agg.reviewCount}{" "}
          {agg.reviewCount === 1 ? "review" : "reviews"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 22,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {reviews.map((r, i) => (
          <figure key={`${r.author}-${i}`} className="candy-review">
            <Stars rating={r.rating} />
            {r.title && (
              <h3 style={{ fontSize: 18, margin: "12px 0 6px" }}>{r.title}</h3>
            )}
            <blockquote
              style={{ fontSize: 17, fontWeight: 700, margin: "10px 0 14px", lineHeight: 1.45 }}
            >
              "{r.body}"
            </blockquote>
            <figcaption style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)" }}>
              {r.author}
              {r.verified && (
                <span style={{ color: "var(--bubblegum-d)" }}> · Verified buyer</span>
              )}
            </figcaption>
            {r.incentivized && (
              <p style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                Received free product in exchange for an honest review.
              </p>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
