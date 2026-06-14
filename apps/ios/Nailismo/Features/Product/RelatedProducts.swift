import SwiftUI

// "You may also like" — Shopify product recommendations, ported from apps/web
// RelatedProducts. Reuses ProductCard so the rail matches the shop grid exactly.
// A horizontal rail (not a grid) keeps it on the scrolling PDP without nesting a
// vertical grid inside the outer ScrollView.
struct RelatedProducts: View {
    let products: [Product]

    var body: some View {
        if !products.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow("more to crave")
                    Text("You may also like").font(.display(24)).foregroundStyle(Candy.ink)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(Array(products.prefix(8).enumerated()), id: \.element.id) { i, p in
                            ProductCard(product: p, index: i)
                                .frame(width: 170)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }
}
