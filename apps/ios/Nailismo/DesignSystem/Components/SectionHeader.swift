import SwiftUI

// Section title + optional "See all" link.
struct SectionHeader: View {
    let title: String
    var actionLabel: String = "See all"
    var action: (() -> Void)? = nil

    var body: some View {
        HStack(alignment: .bottom) {
            Text(title)
                .font(.display(22))
                .foregroundStyle(Candy.ink)
            Spacer()
            if let action {
                Button(action: action) {
                    Text("\(actionLabel) →")
                        .font(.bodyFont(13, .bold))
                        .foregroundStyle(Candy.accent)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
