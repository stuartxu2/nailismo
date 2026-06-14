import SwiftUI

// "Press on in 4 steps" guide — ported from apps/web PressOnSteps. Sits on the
// nail-set PDP below the gallery as one candy panel wrapping a 2×2 step grid.
struct PressOnSteps: View {
    private struct Step: Identifiable {
        let id = UUID()
        let n: String
        let emoji: String
        let title: String
        let body: String
    }

    private let steps: [Step] = [
        Step(n: "1", emoji: "📏", title: "Match", body: "Use Find My Size for a perfect fit in 30 seconds."),
        Step(n: "2", emoji: "💅", title: "Press", body: "Peel, press, hold ten seconds. Full set on in minutes."),
        Step(n: "3", emoji: "✂️", title: "Clip", body: "Trim and file to your length and shape. Up to you."),
        Step(n: "4", emoji: "✨", title: "Show off", body: "Wear all week, then pop them off clean — no damage."),
    ]

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow("so easy it's silly")
                Text("Press on in 4 steps").font(.display(24)).foregroundStyle(Candy.ink)
            }

            LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
                ForEach(steps) { step in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 10) {
                            Text(step.n)
                                .font(.display(15))
                                .foregroundStyle(Candy.ink)
                                .frame(width: 30, height: 30)
                                .background(Candy.pop, in: Circle())
                                .overlay(Circle().stroke(Candy.ink, lineWidth: 2))
                            Text(step.emoji).font(.system(size: 20))
                        }
                        Text(step.title)
                            .font(.display(18))
                            .foregroundStyle(Candy.ink)
                        Text(step.body)
                            .font(.bodyFont(13, .semibold))
                            .foregroundStyle(Candy.subtle)
                            .lineSpacing(2)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(Candy.surface, in: RoundedRectangle(cornerRadius: 18))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(Candy.ink, lineWidth: 2))
                    .candyShadow()
                }
            }
        }
    }
}
