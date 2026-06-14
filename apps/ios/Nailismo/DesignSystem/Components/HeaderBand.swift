import SwiftUI

// The app's signature chrome: a curved slate band that bleeds under the status
// bar. Lifted from the inspiration's teal headers, re-skinned to brand slate.
// Place it at the TOP of a screen — it handles its own top-safe-area bleed, so
// don't wrap it in another top inset.
struct HeaderBand<Trailing: View>: View {
    var eyebrow: String? = nil
    var title: String
    var titleSize: CGFloat = 30
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                if let eyebrow {
                    Eyebrow(eyebrow, color: Candy.onAccent.opacity(0.85))
                }
                Text(title)
                    .font(.display(titleSize))
                    .foregroundStyle(Candy.surface)
            }
            Spacer(minLength: 8)
            trailing()
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(alignment: .top) {
            Candy.muted
                .clipShape(
                    UnevenRoundedRectangle(
                        cornerRadii: RectangleCornerRadii(bottomLeading: 28, bottomTrailing: 28)
                    )
                )
                .softShadow()
                .ignoresSafeArea(edges: .top)
        }
    }
}

// Convenience initializer for bands with no trailing accessory.
extension HeaderBand where Trailing == EmptyView {
    init(eyebrow: String? = nil, title: String, titleSize: CGFloat = 30) {
        self.init(eyebrow: eyebrow, title: title, titleSize: titleSize, trailing: { EmptyView() })
    }
}
