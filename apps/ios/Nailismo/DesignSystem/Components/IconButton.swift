import SwiftUI

// Round 42pt action button (bell / cart / edit) with an optional count badge.
struct IconButton: View {
    let systemName: String
    var tint: Color = Candy.ink
    var bg: Color = Candy.surface
    var badge: Int? = nil
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(bg)
                .frame(width: 42, height: 42)
                .overlay {
                    Image(systemName: systemName)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(tint)
                }
                .softShadow()
                .overlay(alignment: .topTrailing) {
                    if let badge, badge > 0 {
                        Text("\(badge)")
                            .font(.bodyFont(10, .bold))
                            .foregroundStyle(Candy.ink)
                            .padding(.horizontal, 5)
                            .frame(minWidth: 18, minHeight: 18)
                            .background(Candy.pop, in: Capsule())
                            .overlay(Capsule().stroke(Candy.surface, lineWidth: 1.5))
                            .offset(x: 6, y: -6)
                    }
                }
        }
        .buttonStyle(.plain)
    }
}
