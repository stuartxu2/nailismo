import SwiftUI

private let SIZES = ["S", "M", "L", "XL"]
private let VIEW_LABELS = ["The set", "On your hand", "Your kit"]
private let VIEW_CAPTIONS = ["Flat-lay", "Worn", "In the box"]

// Generating + ready states for one session: one design shown three ways, then a
// size picker and the Shopify checkout hand-off (opened in SafariView).
struct CustomizeResultView: View {
    @Environment(CustomizeStore.self) private var store
    var onMeasure: () -> Void = {}

    @State private var checkoutURL: URL?
    @State private var ordering = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header

                if store.phase == .failed {
                    failed
                } else {
                    grid
                    if store.phase == .ready && store.hasReadyDesign {
                        buyPanel
                    }
                }

                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
        .sheet(item: $checkoutURL) { url in
            SafariView(url: url).ignoresSafeArea()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(store.phase == .ready ? "your custom set" : "designing")
            Text(store.phase == .ready ? "Your design, 3 ways." : "Painting your nails… 💅")
                .font(.display(28)).foregroundStyle(Candy.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(store.phase == .ready
                 ? "One hand-painted set — flat-lay, worn on a hand, and in its kit. Grab your size to order it."
                 : "Reading your pic, painting one custom set, then shooting it 3 ways. About a minute! ✨")
                .font(.bodyFont(14)).foregroundStyle(Candy.subtle).lineSpacing(3)
        }
    }

    private var grid: some View {
        VStack(spacing: 14) {
            ForEach(0..<3, id: \.self) { i in
                let job = i < store.jobs.count ? store.jobs[i] : nil
                ZStack {
                    RoundedRectangle(cornerRadius: Radius.lg).fill(Candy.surface)
                    if let job, job.status == "ready", let url = job.resultUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { img in
                            img.resizable().scaledToFill()
                        } placeholder: { ProgressView().tint(Candy.accent) }
                        .clipShape(RoundedRectangle(cornerRadius: Radius.lg))
                        .overlay(alignment: .topLeading) {
                            Text(VIEW_LABELS[i]).font(.bodyFont(11, .bold)).foregroundStyle(.white)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(Candy.accent, in: Capsule()).padding(10)
                        }
                    } else if job?.status == "failed" {
                        Text("\(VIEW_CAPTIONS[i]) unavailable 🥲")
                            .font(.bodyFont(14, .bold)).foregroundStyle(Candy.subtle)
                    } else {
                        VStack(spacing: 8) {
                            Text("💅").font(.system(size: 34))
                            Text("\(VIEW_CAPTIONS[i])…").font(.bodyFont(13, .bold)).foregroundStyle(Candy.ink)
                        }
                    }
                }
                .frame(height: 300)
                .candyShadow()
            }
        }
    }

    private var buyPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow("your size")
            HStack(spacing: 8) {
                ForEach(SIZES, id: \.self) { s in
                    let active = store.selectedSize == s
                    Button { store.selectedSize = s } label: {
                        Text(s).font(.bodyFont(14, .bold)).frame(minWidth: 52)
                            .foregroundStyle(active ? Candy.onPop : Candy.ink)
                            .padding(.vertical, 10)
                            .background(active ? Candy.pop : Candy.surface, in: Capsule())
                            .overlay(Capsule().stroke(active ? Candy.pop : Candy.border, lineWidth: 1.5))
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            Button("Not sure? Measure your nails →", action: onMeasure)
                .font(.bodyFont(14, .bold)).foregroundStyle(Candy.accent)

            VStack(spacing: 6) {
                priceRow("Custom Nail Set", "$69.00", strong: false)
                priceRow("Design deposit 💸", "−$2.00", strong: false, accent: true)
                Rectangle().fill(Candy.ink).frame(height: 2).padding(.vertical, 6)
                priceRow("You pay today", "$67.00", strong: true)
            }
            .padding(18)
            .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
            .candyShadow()

            if let error = store.errorMessage {
                Text(error).font(.bodyFont(13, .semibold)).foregroundStyle(Color(hex: "C0392B"))
            }

            CandyButton(title: ordering ? "Starting checkout…" : "Order my custom set", variant: .pop) {
                guard store.canOrder, !ordering else { return }
                ordering = true
                Task { checkoutURL = await store.order(); ordering = false }
            }
            .disabled(!store.canOrder || ordering)
            .opacity(!store.canOrder || ordering ? 0.45 : 1)
        }
    }

    private var failed: some View {
        VStack(spacing: 12) {
            Text("🫶").font(.system(size: 44))
            Text("That render didn't work out.").font(.display(20)).foregroundStyle(Candy.ink)
            Text("That one flopped on our end, so your $2's been refunded. Try again with another pic!")
                .font(.bodyFont(14)).foregroundStyle(Candy.subtle).multilineTextAlignment(.center)
            CandyButton(title: "Start a new design", variant: .pop) { store.reset() }.frame(maxWidth: 240)
        }
        .frame(maxWidth: .infinity).padding(.top, 40)
    }

    private func priceRow(_ label: String, _ value: String, strong: Bool, accent: Bool = false) -> some View {
        HStack {
            Text(label).font(.bodyFont(strong ? 15 : 14, strong ? .bold : .semibold))
                .foregroundStyle(strong ? Candy.ink : Candy.subtle)
            Spacer()
            Text(value).font(.display(strong ? 20 : 16))
                .foregroundStyle(accent ? Candy.accent : Candy.ink)
        }
    }
}

// Lets `.sheet(item:)` drive on a URL.
extension URL: @retroactive Identifiable { public var id: String { absoluteString } }
