import SwiftUI

private enum SortOrder: String, CaseIterable {
    case featured = "Featured"
    case priceLow = "Price ↑"
    case priceHigh = "Price ↓"
    case az = "A–Z"
}

struct ShopView: View {
    @Environment(CatalogStore.self) private var catalog
    @Environment(CartStore.self) private var cart
    @Environment(AppRouter.self) private var router

    @State private var search = ""
    @State private var activeTag: String? = nil
    @State private var sort: SortOrder = .featured

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    private var filtered: [Product] {
        var list = catalog.products
        if let activeTag { list = list.filter { $0.tags.contains(activeTag) } }
        let q = search.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty { list = list.filter { $0.title.localizedCaseInsensitiveContains(q) } }
        switch sort {
        case .featured: break
        case .priceLow: list.sort { price($0) < price($1) }
        case .priceHigh: list.sort { price($0) > price($1) }
        case .az: list.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        }
        return list
    }

    private func price(_ p: Product) -> Double { Double(p.priceRange.minVariantPrice.amount) ?? 0 }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HeaderBand(eyebrow: "the candy rack", title: "Shop") {
                    IconButton(systemName: "bag", badge: cart.count) { router.showCart = true }
                }

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        SearchBar(placeholder: "Search the rack…", text: $search, editable: true)

                        chips(title: nil, items: ["All"] + catalog.topTags(), selected: activeTag ?? "All") { tag in
                            activeTag = (tag == "All") ? nil : tag
                        }
                        chips(title: nil, items: SortOrder.allCases.map(\.rawValue), selected: sort.rawValue) { raw in
                            if let s = SortOrder(rawValue: raw) { sort = s }
                        }

                        if catalog.products.isEmpty {
                            if let error = catalog.errorMessage {
                                ErrorRow(message: error) { Task { await catalog.reload() } }
                            } else {
                                LoadingRow()
                            }
                        } else if filtered.isEmpty {
                            EmptyRack { activeTag = nil; search = "" }
                        } else {
                            LazyVGrid(columns: columns, spacing: 12) {
                                ForEach(Array(filtered.enumerated()), id: \.element.id) { i, p in
                                    ProductCard(product: p, index: i)
                                }
                            }
                        }

                        Color.clear.frame(height: 92)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                }
            }
            .background(Candy.bg)
            .navigationDestination(for: ProductRoute.self) { ProductDetailView(handle: $0.handle) }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private func chips(
        title: String?,
        items: [String],
        selected: String,
        onTap: @escaping (String) -> Void
    ) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(items, id: \.self) { item in
                    let active = item == selected
                    Text(item)
                        .font(.bodyFont(13, .bold))
                        .foregroundStyle(active ? Candy.ink : Candy.subtle)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background(active ? Candy.pop : Candy.surface, in: Capsule())
                        .overlay(Capsule().stroke(active ? Candy.ink : Candy.border, lineWidth: 1))
                        .contentShape(Capsule())
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) { onTap(item) }
                        }
                }
            }
            .padding(.vertical, 1)
        }
    }
}

private struct EmptyRack: View {
    var clear: () -> Void
    var body: some View {
        VStack(spacing: 12) {
            Text("🫥").font(.system(size: 44))
            Text("Nothing matches that")
                .font(.display(18, .semibold))
                .foregroundStyle(Candy.ink)
            CandyButton(title: "Clear filters", variant: .ink, action: clear)
                .frame(maxWidth: 180)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}
