import SwiftUI

struct FavoritesView: View {
    var onSelectTab: (Tab) -> Void = { _ in }
    @Environment(FavoritesStore.self) private var favorites

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HeaderBand(eyebrow: "saved", title: "Favorite")

                if favorites.items.isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("\(favorites.items.count) saved")
                                .font(.bodyFont(13, .semibold))
                                .foregroundStyle(Candy.subtle)
                            LazyVGrid(columns: columns, spacing: 12) {
                                ForEach(Array(favorites.items.enumerated()), id: \.element.id) { i, p in
                                    ProductCard(product: p, index: i)
                                }
                            }
                            Color.clear.frame(height: 92)
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                    }
                }
            }
            .background(Candy.bg)
            .navigationDestination(for: ProductRoute.self) { ProductDetailView(handle: $0.handle) }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()
            ZStack {
                Circle().fill(Candy.surface).frame(width: 96, height: 96).candyShadow()
                Image(systemName: "heart")
                    .font(.system(size: 38, weight: .semibold))
                    .foregroundStyle(Candy.muted)
            }
            Text("No favorites yet")
                .font(.display(24))
                .foregroundStyle(Candy.ink)
            Text("Tap the heart on any set to save it here.")
                .font(.bodyFont(15))
                .foregroundStyle(Candy.subtle)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            CandyButton(title: "Browse the rack", variant: .pop) { onSelectTab(.shop) }
                .frame(maxWidth: 220)
            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
