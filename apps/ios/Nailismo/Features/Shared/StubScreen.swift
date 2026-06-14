import SwiftUI

// Pass-1 placeholder screen: a real on-brand HeaderBand over a centered marker,
// on the lilac background. Proves the design system + navigation end-to-end
// before the feature work lands.
struct StubScreen<Trailing: View>: View {
    var eyebrow: String?
    var bandTitle: String
    var titleSize: CGFloat = 30
    var icon: String
    var heading: String
    var note: String
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        VStack(spacing: 0) {
            HeaderBand(eyebrow: eyebrow, title: bandTitle, titleSize: titleSize, trailing: trailing)
            Spacer()
            StubBody(icon: icon, heading: heading, note: note)
            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Candy.bg.ignoresSafeArea())
    }
}

extension StubScreen where Trailing == EmptyView {
    init(
        eyebrow: String? = nil,
        bandTitle: String,
        titleSize: CGFloat = 30,
        icon: String,
        heading: String,
        note: String
    ) {
        self.init(
            eyebrow: eyebrow,
            bandTitle: bandTitle,
            titleSize: titleSize,
            icon: icon,
            heading: heading,
            note: note,
            trailing: { EmptyView() }
        )
    }
}

private struct StubBody: View {
    let icon: String
    let heading: String
    let note: String

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle().fill(Candy.surface).frame(width: 96, height: 96).candyShadow()
                Image(systemName: icon)
                    .font(.system(size: 38, weight: .semibold))
                    .foregroundStyle(Candy.muted)
            }
            Text(heading)
                .font(.display(28))
                .foregroundStyle(Candy.ink)
            Text(note)
                .font(.bodyFont(15))
                .foregroundStyle(Candy.subtle)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 44)
        }
    }
}
