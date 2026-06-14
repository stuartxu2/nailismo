import SwiftUI

struct HomeView: View {
    var onSelectTab: (Tab) -> Void = { _ in }
    @Environment(CatalogStore.self) private var catalog
    @Environment(CartStore.self) private var cart
    @Environment(AppRouter.self) private var router

    private var favorites: [Product] { Array(catalog.products.prefix(8)) }
    private var newFlavors: [Product] { Array(catalog.products.reversed().prefix(8)) }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HeaderBand(eyebrow: "press on · show off", title: "nailismo", titleSize: 30) {
                    HStack(spacing: 10) {
                        IconButton(systemName: "bell")
                        IconButton(systemName: "bag", badge: cart.count) { router.showCart = true }
                    }
                }

                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        SearchBar(text: .constant(""), editable: false) { onSelectTab(.shop) }

                        HeroCard { onSelectTab(.shop) }

                        if let error = catalog.errorMessage, catalog.products.isEmpty {
                            ErrorRow(message: error) { Task { await catalog.reload() } }
                        } else if catalog.products.isEmpty {
                            LoadingRow()
                        } else {
                            collectionsSection
                            rail(title: "Fan favorites", products: favorites)
                            rail(title: "New flavors", products: newFlavors)
                        }

                        FindSizeBand { onSelectTab(.measure) }

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

    @ViewBuilder private var collectionsSection: some View {
        if !catalog.collections.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(title: "Shop by collection") { onSelectTab(.shop) }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(catalog.collections) { col in
                            CategoryCircle(label: col.title, imageURL: col.thumbURL) {
                                onSelectTab(.shop)
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private func rail(title: String, products: [Product]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: title) { onSelectTab(.shop) }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(Array(products.enumerated()), id: \.element.id) { i, p in
                        ProductCard(product: p, index: i)
                            .frame(width: 170)
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }
}

// Slate hero promo, lime CTA.
private struct HeroCard: View {
    var onShop: () -> Void
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Circle().fill(Candy.pop.opacity(0.9)).frame(width: 130, height: 130)
                .offset(x: 30, y: 36).blur(radius: 1)
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow("fresh candy drop", color: Candy.onAccent.opacity(0.85))
                Text("Press On.\nShow Off.")
                    .font(.display(30))
                    .foregroundStyle(Candy.surface)
                    .fixedSize(horizontal: false, vertical: true)
                CandyButton(title: "Shop the Candy Rack", variant: .pop, action: onShop)
                    .frame(maxWidth: 230)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Candy.muted, in: RoundedRectangle(cornerRadius: 26))
        .clipShape(RoundedRectangle(cornerRadius: 26))
        .candyShadow()
    }
}

// Lime find-my-size band.
private struct FindSizeBand: View {
    var onMeasure: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow("perfect fit", color: Candy.ink.opacity(0.6))
            Text("Not sure of your size?")
                .font(.display(22))
                .foregroundStyle(Candy.ink)
            Text("One photo + a bank card reads your set size in under a minute.")
                .font(.bodyFont(14))
                .foregroundStyle(Candy.ink.opacity(0.75))
            CandyButton(title: "Find my size 📏", variant: .ink, action: onMeasure)
                .frame(maxWidth: 200)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Candy.pop, in: RoundedRectangle(cornerRadius: 26))
        .overlay(RoundedRectangle(cornerRadius: 26).stroke(Candy.ink, lineWidth: 1.5))
        .popShadow()
    }
}

struct LoadingRow: View {
    var body: some View {
        HStack { Spacer(); ProgressView().tint(Candy.accent); Spacer() }
            .frame(height: 160)
    }
}

struct ErrorRow: View {
    let message: String
    var retry: () -> Void
    var body: some View {
        VStack(spacing: 12) {
            Text("Couldn't load the shop")
                .font(.display(18, .semibold))
                .foregroundStyle(Candy.ink)
            Text(message)
                .font(.bodyFont(13))
                .foregroundStyle(Candy.subtle)
                .multilineTextAlignment(.center)
            CandyButton(title: "Try again", variant: .ink, action: retry)
                .frame(maxWidth: 180)
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
    }
}
