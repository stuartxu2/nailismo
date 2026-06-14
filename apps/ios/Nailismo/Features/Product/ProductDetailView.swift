import SwiftUI
import UIKit

private let freeShipThreshold = 35.0

private let trustPoints = [
    "10 premium nails + toolkit included",
    "100% hand-painted",
    "Free shipping over $35",
    "30-day unopened returns + fit exchange",
]

private let specs: [(k: String, v: String)] = [
    ("Wears", "Up to 7 days"),
    ("On in", "Minutes"),
    ("In the box", "10 nails + toolkit"),
    ("Removal", "Clean & easy"),
]

struct ProductDetailView: View {
    let handle: String

    @Environment(\.dismiss) private var dismiss
    @Environment(CartStore.self) private var cart
    @Environment(AppRouter.self) private var router

    @State private var product: ProductDetail?
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var selectedSize: String?
    @State private var justAdded = false
    @State private var recommendations: [Product] = []
    @State private var reviews: [Review] = []
    @State private var reviewAgg: ReviewAggregate?

    private let screenW = UIScreen.main.bounds.width

    var body: some View {
        Group {
            if let product {
                content(product)
            } else if loading {
                ProgressView().tint(Candy.accent)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                missing
            }
        }
        .background(Candy.bg.ignoresSafeArea())
        .overlay(alignment: .topLeading) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Candy.ink)
                    .frame(width: 40, height: 40)
                    .background(Candy.surface, in: Circle())
                    .softShadow()
            }
            .buttonStyle(.plain)
            .padding(.leading, 16)
            .padding(.top, 6)
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await load() }
    }

    private func content(_ p: ProductDetail) -> some View {
        let images = p.images.nodes.isEmpty ? (p.featuredImage.map { [$0] } ?? []) : p.images.nodes

        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Gallery
                TabView {
                    ForEach(Array(images.enumerated()), id: \.offset) { _, img in
                        AsyncImage(url: img.asURL) { image in
                            image.resizable().scaledToFill()
                        } placeholder: { Candy.surface }
                        .frame(width: screenW, height: screenW)
                        .clipped()
                    }
                }
                .frame(height: screenW)
                .tabViewStyle(.page(indexDisplayMode: images.count > 1 ? .automatic : .never))

                VStack(alignment: .leading, spacing: 20) {
                    switch p.productClass {
                    case .nail: nailDetails(p)
                    case .gift: simpleDetails(p, kind: .gift)
                    case .essential: simpleDetails(p, kind: .essential)
                    }

                    // Shared across templates — mirrors the web PDP footer order.
                    RelatedProducts(products: recommendations)
                        .padding(.top, 12)
                    ProductReviews(reviews: reviews, aggregate: reviewAgg)
                        .padding(.top, 12)

                    Color.clear.frame(height: 100)
                }
                .padding(20)
            }
        }
    }

    // Full nail-set template: trust, sizing, free-ship nudge, specs, press-on
    // guide, FAQ, and the real-hands UGC strip.
    @ViewBuilder private func nailDetails(_ p: ProductDetail) -> some View {
        let description = plainText(fromHTML: p.descriptionHtml)
        let variant = p.variant(forSize: selectedSize)
        let money = variant?.price ?? p.priceRange.minVariantPrice
        let needsSize = p.sizeOption != nil && selectedSize == nil
        let available = variant?.availableForSale ?? false
        let canAdd = available && !needsSize
        let underFreeShip = available && (Double(money.amount) ?? 0) < freeShipThreshold

        titleBlock(eyebrow: p.productType?.isEmpty == false ? p.productType! : "Press-On Set", title: p.title)

        HStack(alignment: .center) {
            Text(priceLabel(money)).font(.display(40)).foregroundStyle(Candy.ink)
            Spacer()
            StockPill(available: available)
        }

        TrustCard()

        if let sizeOption = p.sizeOption {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow("choose size")
                HStack(spacing: 10) {
                    ForEach(sizeOption.values, id: \.self) { value in
                        let ok = sizeAvailable(p, value)
                        SizeChip(label: value, active: selectedSize == value, soldOut: !ok) {
                            selectedSize = value
                        }
                    }
                }
                Text("Not sure? Tap **Measure** below — most first-timers finish in ~90 seconds. Fit exchange available if it's off.")
                    .font(.bodyFont(13))
                    .foregroundStyle(Candy.subtle)
                    .lineSpacing(2)
            }
        }

        if underFreeShip { FreeShipBanner() }

        addToBag(label: addLabel(needsSize: needsSize, canAdd: canAdd, price: priceLabel(money)),
                 canAdd: canAdd, variantId: variant?.id)

        tagStrip(p.tags)
        detailsBlock(description)

        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(specs, id: \.k) { SpecCard(title: $0.k, value: $0.v) }
        }

        PressOnSteps().padding(.top, 12)
        ProductFaqSection(title: p.title, productType: p.productType).padding(.top, 12)
        UgcStrip().padding(.top, 12)
    }

    // Leaner template for gift cards + care essentials — drops sizing, trust, the
    // press-on guide, and press-on FAQ. Mirrors web SimpleProductTemplate.
    @ViewBuilder private func simpleDetails(_ p: ProductDetail, kind: SimpleKind) -> some View {
        let description = plainText(fromHTML: p.descriptionHtml)
        // Pick the chosen variant by its option value (gift-card denominations),
        // falling back to the first available variant.
        let variant = simpleVariant(p)
        let money = variant?.price ?? p.priceRange.minVariantPrice
        let firstOption = p.options.first { $0.values.count > 1 }
        let needsChoice = firstOption != nil && selectedSize == nil
        let available = variant?.availableForSale ?? false
        let canAdd = available && !needsChoice

        titleBlock(eyebrow: kind.eyebrow, title: p.title)

        HStack(alignment: .center) {
            Text(priceLabel(money)).font(.display(40)).foregroundStyle(Candy.ink)
            Spacer()
            StockPill(available: available)
        }

        if let firstOption {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow(firstOption.name)
                HStack(spacing: 10) {
                    ForEach(firstOption.values, id: \.self) { value in
                        SizeChip(label: value, active: selectedSize == value) { selectedSize = value }
                    }
                }
            }
        }

        addToBag(label: simpleAddLabel(kind: kind, needsChoice: needsChoice, canAdd: canAdd),
                 canAdd: canAdd, variantId: variant?.id)

        detailsBlock(description)

        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(kind.info, id: \.k) { SpecCard(title: $0.k, value: $0.v) }
        }

        if kind == .gift { GiftSteps().padding(.top, 12) }
    }

    // MARK: shared template pieces

    @ViewBuilder private func titleBlock(eyebrow: String, title: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(eyebrow)
            Text(title).font(.display(30)).foregroundStyle(Candy.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder private func addToBag(label: String, canAdd: Bool, variantId: String?) -> some View {
        CandyButton(title: label, variant: canAdd ? .pop : .ink) {
            guard canAdd, let variantId else { return }
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            withAnimation { justAdded = true }
            Task {
                await cart.addLine(variantId)
                router.showCart = true
                try? await Task.sleep(for: .seconds(1.6))
                withAnimation { justAdded = false }
            }
        }
        .disabled(!canAdd)
        .opacity(canAdd ? 1 : 0.6)
    }

    @ViewBuilder private func tagStrip(_ tags: [String]) -> some View {
        if !tags.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(tags.prefix(8)), id: \.self) { tag in
                        Text(tag)
                            .font(.bodyFont(13, .bold))
                            .foregroundStyle(Candy.ink)
                            .padding(.vertical, 7).padding(.horizontal, 14)
                            .background(Candy.surface, in: Capsule())
                            .overlay(Capsule().stroke(Candy.border, lineWidth: 1))
                    }
                }
                .padding(.vertical, 1)
            }
        }
    }

    @ViewBuilder private func detailsBlock(_ description: String) -> some View {
        if !description.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow("details")
                Text(description)
                    .font(.bodyFont(15)).foregroundStyle(Candy.subtle).lineSpacing(4)
            }
        }
    }

    private func simpleVariant(_ p: ProductDetail) -> VariantDetail? {
        if let selectedSize {
            let matches = p.variants.nodes.filter {
                $0.selectedOptions.contains { $0.value == selectedSize }
            }
            return matches.first { $0.availableForSale } ?? matches.first
        }
        return p.variants.nodes.first { $0.availableForSale } ?? p.variants.nodes.first
    }

    private func simpleAddLabel(kind: SimpleKind, needsChoice: Bool, canAdd: Bool) -> String {
        if justAdded { return "Added to bag ✓" }
        if needsChoice { return "Choose an option" }
        if !canAdd { return "Sold out" }
        return kind.cta
    }

    private func sizeAvailable(_ p: ProductDetail, _ value: String) -> Bool {
        p.variants.nodes.contains {
            $0.availableForSale && $0.selectedOptions.contains { $0.name == "Size" && $0.value == value }
        }
    }

    private func addLabel(needsSize: Bool, canAdd: Bool, price: String) -> String {
        if justAdded { return "Added to bag ✓" }
        if needsSize { return "Select a size" }
        if !canAdd { return "Sold out" }
        return "Add to Bag · \(price)"
    }

    private func priceLabel(_ money: Money) -> String {
        let v = Double(money.amount) ?? 0
        let whole = v.truncatingRemainder(dividingBy: 1) == 0
        if money.currencyCode == "USD" {
            return whole ? "$\(Int(v))" : String(format: "$%.2f", v)
        }
        return whole ? "\(Int(v)) \(money.currencyCode)" : String(format: "%.2f \(money.currencyCode)", v)
    }

    private var missing: some View {
        VStack(spacing: 14) {
            Text("Couldn't load this set")
                .font(.display(18, .semibold)).foregroundStyle(Candy.ink)
            if let errorMessage {
                Text(errorMessage)
                    .font(.bodyFont(13)).foregroundStyle(Candy.subtle)
                    .multilineTextAlignment(.center).padding(.horizontal, 40)
            }
            CandyButton(title: "Back", variant: .ink) { dismiss() }.frame(maxWidth: 160)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func load() async {
        guard product == nil else { return }
        loading = true
        do {
            let data = try await StorefrontClient.shared.fetch(
                Queries.productByHandle, variables: ["handle": handle], as: ProductData.self
            )
            product = data.product
            if let loaded = data.product {
                await loadExtras(productId: loaded.id)
            } else {
                errorMessage = "Not found."
            }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        loading = false
    }

    // Recommendations + reviews load after the product so the page paints first;
    // both degrade silently to empty (their sections simply don't render).
    private func loadExtras(productId: String) async {
        async let recs: [Product] = {
            (try? await StorefrontClient.shared.fetch(
                Queries.productRecommendations,
                variables: ["productId": productId],
                as: RecommendationsData.self
            ))?.productRecommendations ?? []
        }()
        async let revs = ReviewsClient.shared.fetch(productId: productId)

        let (r, rv) = await (recs, revs)
        recommendations = r
        reviews = rv.reviews
        reviewAgg = rv.aggregate
    }
}

// Copy + specs for the leaner gift/essential templates (mirrors web COPY map).
enum SimpleKind: Equatable {
    case gift, essential

    var eyebrow: String { self == .gift ? "Digital Gift Card" : "Nail Care" }
    var cta: String { self == .gift ? "Add Gift Card" : "Add to Bag" }

    var info: [(k: String, v: String)] {
        switch self {
        case .gift:
            return [("Delivery", "Instant email"), ("Validity", "Never expires"),
                    ("Redeem", "At checkout"), ("Amounts", "$10–$50")]
        case .essential:
            return [("Formula", "Salon-grade"), ("Pairs with", "Any set"),
                    ("Cruelty-free", "Always"), ("Returns", "30 days")]
        }
    }
}

// "How gifting works" — gift-card-only 3-step explainer (web GIFT_STEPS).
private struct GiftSteps: View {
    private struct Step: Identifiable {
        let id = UUID(); let emoji: String; let title: String; let body: String
    }
    private let steps: [Step] = [
        Step(emoji: "🎁", title: "Pick an amount", body: "Choose $10, $25, or $50 — whatever fits the moment."),
        Step(emoji: "📧", title: "We email the code", body: "Sent to your inbox, or straight to them with a note."),
        Step(emoji: "🛍️", title: "Redeem at checkout", body: "Applies to any order on Nailismo, anytime."),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow("so easy it's silly")
                Text("How gifting works").font(.display(24)).foregroundStyle(Candy.ink)
            }
            VStack(spacing: 12) {
                ForEach(Array(steps.enumerated()), id: \.element.id) { i, s in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 12) {
                            Text("\(i + 1)")
                                .font(.display(15)).foregroundStyle(Candy.ink)
                                .frame(width: 30, height: 30)
                                .background(Candy.pop, in: Circle())
                                .overlay(Circle().stroke(Candy.ink, lineWidth: 2))
                            Text(s.emoji).font(.system(size: 22))
                        }
                        Text(s.title).font(.display(18)).foregroundStyle(Candy.ink)
                        Text(s.body)
                            .font(.bodyFont(14, .semibold)).foregroundStyle(Candy.subtle)
                            .lineSpacing(2).fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .background(Candy.surface, in: RoundedRectangle(cornerRadius: 22))
                    .overlay(RoundedRectangle(cornerRadius: 22).stroke(Candy.ink, lineWidth: 2))
                    .candyShadow()
                }
            }
        }
    }
}

// MARK: - Pieces

private struct StockPill: View {
    let available: Bool
    var body: some View {
        Text(available ? "In stock · ships in 24h" : "Sold out")
            .font(.bodyFont(11, .bold))
            .foregroundStyle(Candy.ink)
            .padding(.vertical, 6).padding(.horizontal, 12)
            .background(available ? Candy.pop : Candy.border, in: Capsule())
            .overlay(Capsule().stroke(Candy.ink, lineWidth: 1.5))
            .rotationEffect(.degrees(-3))
    }
}

private struct TrustCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            ForEach(trustPoints, id: \.self) { point in
                HStack(spacing: 10) {
                    Image(systemName: "checkmark")
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(Candy.ink)
                        .frame(width: 22, height: 22)
                        .background(Candy.pop, in: Circle())
                        .overlay(Circle().stroke(Candy.ink, lineWidth: 2))
                    Text(point)
                        .font(.bodyFont(14, .bold)).foregroundStyle(Candy.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Candy.ink, lineWidth: 2))
        .candyShadow()
    }
}

private struct FreeShipBanner: View {
    var body: some View {
        HStack(spacing: 10) {
            Text("🚚").font(.system(size: 18))
            Text("Add one more set to unlock free shipping.")
                .font(.bodyFont(14, .bold)).foregroundStyle(Candy.onAccent)
        }
        .padding(.vertical, 12).padding(.horizontal, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Candy.muted, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Candy.ink, lineWidth: 2))
        .candyShadow()
    }
}

private struct SpecCard: View {
    let title: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(title)
            Text(value).font(.bodyFont(16, .bold)).foregroundStyle(Candy.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16).padding(.vertical, 14)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Candy.ink, lineWidth: 2))
        .candyShadow()
    }
}

private struct SizeChip: View {
    let label: String
    let active: Bool
    var soldOut: Bool = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.bodyFont(15, .bold))
                .foregroundStyle(active ? Candy.onAccent : Candy.ink)
                .strikethrough(soldOut)
                .frame(minWidth: 54)
                .padding(.vertical, 12).padding(.horizontal, 14)
                .background(active ? Candy.ink : Candy.surface, in: RoundedRectangle(cornerRadius: Radius.md))
                .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(active ? Candy.ink : Candy.border, lineWidth: 1.5))
                .opacity(soldOut ? 0.45 : 1)
        }
        .buttonStyle(.plain)
    }
}
