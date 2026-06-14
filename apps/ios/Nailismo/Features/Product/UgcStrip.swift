import SwiftUI

// Real-hands proof strip — ported from apps/web UgcStrip. Images live on the
// production site; loaded over the network (AVIF, decoded natively on iOS 16+).
struct UgcStrip: View {
    var heading: String = "Worn loud. Worn minimal."

    // Editorial order, matching the web strip.
    private let order = [1, 5, 3, 8, 7, 2, 11, 10, 4, 9, 6]
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Eyebrow("real hands")
                Text(heading).font(.display(22)).foregroundStyle(Candy.ink)
                Text("Short, long, masc, femme, expressive — styled on every kind of hand.")
                    .font(.bodyFont(13, .semibold)).foregroundStyle(Candy.subtle)
            }

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(order, id: \.self) { n in
                    Rectangle()
                        .fill(Candy.surface)
                        .aspectRatio(1, contentMode: .fit)
                        .overlay {
                            AsyncImage(url: URL(string: "https://\(Config.scanHost)/images/ugc/ugc-\(n).avif")) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Candy.bg
                            }
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Candy.ink, lineWidth: 2))
                        .candyShadow()
                }
            }
        }
    }
}
