import SwiftUI

// Collectible candy product card — square image on a rotating pastel tile, heart
// overlay, title, price, and color-tag dots. Pushes the PDP via value route.
struct ProductCard: View {
    let product: Product
    var index: Int = 0
    var showHeart: Bool = true

    var body: some View {
        NavigationLink(value: ProductRoute(handle: product.handle)) {
            VStack(alignment: .leading, spacing: 0) {
                ZStack(alignment: .topTrailing) {
                    Rectangle()
                        .fill(Candy.surface)
                        .aspectRatio(1, contentMode: .fit)
                        .overlay {
                            AsyncImage(url: product.featuredImage?.asURL) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Candy.bg
                            }
                        }
                        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                    if showHeart {
                        HeartButton(product: product).padding(8)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(product.title)
                        .font(.display(16, .semibold))
                        .foregroundStyle(Candy.ink)
                        .lineLimit(1)
                    HStack(spacing: 8) {
                        Text(product.price)
                            .font(.bodyFont(14, .bold))
                            .foregroundStyle(Candy.accent)
                        Spacer(minLength: 0)
                        HStack(spacing: 4) {
                            ForEach(Array(ProductColors.dots(product.tags).prefix(4).enumerated()), id: \.offset) { _, c in
                                Circle()
                                    .fill(c)
                                    .frame(width: 12, height: 12)
                                    .overlay(Circle().stroke(Candy.border, lineWidth: 1))
                            }
                        }
                    }
                }
                .padding(.top, 10)
            }
            .padding(10)
            .background(TileTints.at(index), in: RoundedRectangle(cornerRadius: Radius.lg))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
            .candyShadow()
        }
        .buttonStyle(CardPressStyle())
    }
}

// Subtle scale on press for card-sized tap targets.
struct CardPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
