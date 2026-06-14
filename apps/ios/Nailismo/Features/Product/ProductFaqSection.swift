import SwiftUI

// Per-product FAQ — ported from apps/web ProductFaq. Copy is built from facts
// true of every set, personalized with the product title.
struct ProductFaqSection: View {
    let title: String
    let productType: String?

    private struct Item: Identifiable { let id = UUID(); let q: String; let a: String }

    private var items: [Item] {
        let t = Self.cleanTitle(title)
        let kind = (productType?.trimmingCharacters(in: .whitespaces).isEmpty == false) ? productType! : "press-on set"
        return [
            Item(q: "How long do the \(t) press-ons last?",
                 a: "With the liquid adhesive included in the box, \(t) can last up to 7 days, depending on prep and daily activity. The temporary tabs are best for one-night wear, events, or a first-time test run."),
            Item(q: "What comes in the \(t) box?",
                 a: "Every \(t) set ships with 10 premium press-on nails plus the full toolkit — a sizing range, application tabs, and liquid adhesive — so you can apply at home with no salon visit."),
            Item(q: "How do I find my size for \(t)?",
                 a: "Each \(t) set includes a sizing range. Match every nail to your own before applying. The Measure tool maps your exact fit in about a minute."),
            Item(q: "How do I apply and remove \(t)?",
                 a: "Peel, press, and hold for about ten seconds per nail — a full \(t) set goes on in minutes. To remove, soak and loosen gently; never force them off, since most damage comes from forced removal, not normal wear."),
            Item(q: "Will the \(t) \(kind) look natural?",
                 a: "Yes. \(t) uses salon-grade gel with clean edges and shapes that sit naturally on the hand, so the set reads like a real manicure rather than a costume."),
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow("common questions")
                Text("Good to know").font(.display(24)).foregroundStyle(Candy.ink)
            }
            VStack(spacing: 10) {
                ForEach(items) { FaqRow(question: $0.q, answer: $0.a) }
            }
        }
    }

    // Strip decorative emoji from the title so FAQ copy reads cleanly; keep ASCII.
    private static func cleanTitle(_ raw: String) -> String {
        var out = String.UnicodeScalarView()
        for s in raw.unicodeScalars {
            if s.isASCII { out.append(s); continue }
            if s.properties.isEmoji || s.value == 0xFE0F || s.value == 0x200D { continue }
            out.append(s)
        }
        return String(out)
            .replacingOccurrences(of: "\\s{2,}", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
    }
}

private struct FaqRow: View {
    let question: String
    let answer: String
    @State private var open = false

    var body: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) { open.toggle() }
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Text(question)
                        .font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 8)
                    Image(systemName: "plus")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Candy.ink)
                        .rotationEffect(.degrees(open ? 45 : 0))
                }
                .padding(16)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if open {
                Text(answer)
                    .font(.bodyFont(14)).foregroundStyle(Candy.subtle).lineSpacing(3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16).padding(.bottom, 16)
            }
        }
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Candy.border, lineWidth: 1))
    }
}
