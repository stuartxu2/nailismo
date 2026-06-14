import SwiftUI

// Circular collection chip for the "shop by collection" rails.
struct CategoryCircle: View {
    let label: String
    var imageURL: URL? = nil
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Group {
                    if let imageURL {
                        AsyncImage(url: imageURL) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Candy.bg
                        }
                    } else {
                        Image(systemName: "sparkles")
                            .font(.system(size: 24))
                            .foregroundStyle(Candy.muted)
                    }
                }
                .frame(width: 70, height: 70)
                .background(Candy.surface)
                .clipShape(Circle())
                .overlay(Circle().stroke(Candy.border, lineWidth: 1.5))

                Text(label)
                    .font(.bodyFont(12, .semibold))
                    .foregroundStyle(Candy.ink)
                    .lineLimit(1)
                    .frame(width: 76)
            }
        }
        .buttonStyle(.plain)
    }
}
