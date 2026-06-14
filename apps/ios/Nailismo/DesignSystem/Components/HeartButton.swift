import SwiftUI
import UIKit

// Favorite toggle overlaid on product imagery. Lime when saved, with a bounce.
struct HeartButton: View {
    let product: Product
    @Environment(FavoritesStore.self) private var favorites

    var body: some View {
        let active = favorites.has(product)
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            favorites.toggle(product)
        } label: {
            Image(systemName: active ? "heart.fill" : "heart")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(active ? Candy.pop : Candy.ink)
                .frame(width: 32, height: 32)
                .background(Color.white.opacity(0.92), in: Circle())
                .softShadow()
                .contentTransition(.symbolEffect(.replace))
                .symbolEffect(.bounce, value: active)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(active ? "Remove from favorites" : "Add to favorites")
    }
}
