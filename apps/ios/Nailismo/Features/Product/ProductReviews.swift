import SwiftUI

// PDP review section — ported from apps/web ProductReviews. Renders nothing when
// there are no reviews, so a block shows only when genuine reviews exist. Data
// comes from the web /api/reviews BFF (Judge.me, server-side token).
struct ProductReviews: View {
    let reviews: [Review]
    let aggregate: ReviewAggregate?

    var body: some View {
        if let agg = aggregate, !reviews.isEmpty {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow("reviews")
                    Text("What buyers say").font(.display(24)).foregroundStyle(Candy.ink)
                }

                HStack(spacing: 10) {
                    Stars(rating: agg.ratingValue)
                    Text("\(String(format: "%.1f", agg.ratingValue)) · \(agg.reviewCount) \(agg.reviewCount == 1 ? "review" : "reviews")")
                        .font(.bodyFont(14, .bold))
                        .foregroundStyle(Candy.ink)
                }

                VStack(spacing: 12) {
                    ForEach(reviews) { ReviewCard(review: $0) }
                }
            }
        }
    }
}

private struct ReviewCard: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Stars(rating: Double(review.rating))
            if let title = review.title, !title.isEmpty {
                Text(title).font(.display(17)).foregroundStyle(Candy.ink)
            }
            Text("“\(review.body)”")
                .font(.bodyFont(15, .bold))
                .foregroundStyle(Candy.ink)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 6) {
                Text(review.author)
                    .font(.bodyFont(13, .bold))
                    .foregroundStyle(Candy.subtle)
                if review.verified == true {
                    Text("· Verified buyer")
                        .font(.bodyFont(13, .bold))
                        .foregroundStyle(Candy.accent)
                }
            }
            if review.incentivized == true {
                Text("Received free product in exchange for an honest review.")
                    .font(.bodyFont(12, .semibold))
                    .foregroundStyle(Candy.subtle)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Candy.border, lineWidth: 1))
    }
}

private struct Stars: View {
    let rating: Double
    var body: some View {
        let full = max(0, min(5, Int(rating.rounded())))
        HStack(spacing: 1) {
            ForEach(0..<5, id: \.self) { i in
                Image(systemName: i < full ? "star.fill" : "star")
                    .font(.system(size: 13))
                    .foregroundStyle(Candy.pop)
            }
        }
        .accessibilityLabel("\(String(format: "%.1f", rating)) out of 5 stars")
    }
}
