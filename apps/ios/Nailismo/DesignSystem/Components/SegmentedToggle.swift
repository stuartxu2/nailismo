import SwiftUI

// Lime-pill segmented control (e.g. All / Store on Favorite).
struct SegmentedToggle: View {
    let options: [String]
    @Binding var selection: String

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.self) { opt in
                let active = opt == selection
                Text(opt)
                    .font(.bodyFont(13, .bold))
                    .foregroundStyle(active ? Candy.ink : Candy.subtle)
                    .padding(.vertical, 9)
                    .padding(.horizontal, 20)
                    .background(active ? Candy.pop : .clear, in: Capsule())
                    .contentShape(Capsule())
                    .onTapGesture {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            selection = opt
                        }
                    }
            }
        }
        .padding(4)
        .background(Candy.surface, in: Capsule())
        .softShadow()
    }
}
