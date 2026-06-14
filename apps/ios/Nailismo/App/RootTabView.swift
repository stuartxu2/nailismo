import SwiftUI
import UIKit

enum Tab: Int, CaseIterable {
    case home, shop, measure, favorites, account
}

struct RootTabView: View {
    @State private var tab: Tab = .home
    @State private var catalog = CatalogStore()
    @State private var favorites = FavoritesStore()
    @State private var cart = CartStore()
    @State private var fit = FitStore()
    @State private var auth = AuthStore()
    @State private var router = AppRouter()

    var body: some View {
        ZStack(alignment: .bottom) {
            Candy.bg.ignoresSafeArea()

            Group {
                switch tab {
                case .home: HomeView(onSelectTab: { tab = $0 })
                case .shop: ShopView()
                case .measure: MeasureView(onSelectTab: { tab = $0 })
                case .favorites: FavoritesView(onSelectTab: { tab = $0 })
                case .account: AccountView(onSelectTab: { tab = $0 })
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            CandyTabBar(tab: $tab)
        }
        // NOTE: the cart sheet must be applied BELOW the .environment modifiers so
        // the injected stores wrap the presented sheet — sheets present in a
        // separate hierarchy and only inherit environment applied above them here.
        .sheet(isPresented: Binding(get: { router.showCart }, set: { router.showCart = $0 })) {
            CartView()
                .environment(cart)
                .environment(catalog)
                .environment(favorites)
                .environment(fit)
                .environment(auth)
                .environment(router)
        }
        .environment(catalog)
        .environment(favorites)
        .environment(cart)
        .environment(fit)
        .environment(auth)
        .environment(router)
        .ignoresSafeArea(.keyboard)
        .task { await catalog.loadIfNeeded() }
    }
}

// Custom bottom bar so the priority Measure action can float above the bar — a
// plain SwiftUI TabView can't raise a center button.
struct CandyTabBar: View {
    @Binding var tab: Tab

    private let items: [(tab: Tab, icon: String, label: String)] = [
        (.home, "house.fill", "Home"),
        (.shop, "bag.fill", "Shop"),
        (.measure, "wand.and.rays", "Measure"),
        (.favorites, "heart.fill", "Faves"),
        (.account, "person.fill", "You"),
    ]

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            ForEach(items, id: \.tab) { item in
                if item.tab == .measure {
                    MeasureFAB(active: tab == .measure) { select(.measure) }
                        .frame(maxWidth: .infinity)
                } else {
                    TabBarItem(
                        icon: item.icon,
                        label: item.label,
                        active: tab == item.tab
                    ) { select(item.tab) }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.top, 10)
        .padding(.horizontal, 10)
        .padding(.bottom, 6)
        .background(alignment: .bottom) {
            Candy.surface
                .clipShape(
                    UnevenRoundedRectangle(
                        cornerRadii: RectangleCornerRadii(topLeading: 26, topTrailing: 26)
                    )
                )
                .overlay(alignment: .top) {
                    Rectangle().fill(Candy.border).frame(height: 1)
                }
                .shadow(color: Candy.shadowCard.opacity(0.22), radius: 18, x: 0, y: -6)
                .ignoresSafeArea(edges: .bottom)
        }
    }

    private func select(_ t: Tab) {
        UIImpactFeedbackGenerator(style: t == .measure ? .medium : .light).impactOccurred()
        withAnimation(.spring(response: 0.34, dampingFraction: 0.72)) {
            tab = t
        }
    }
}

private struct TabBarItem: View {
    let icon: String
    let label: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(active ? Candy.ink : Candy.muted)
                    .frame(width: 48, height: 30)
                    .background(active ? Candy.pop : .clear, in: Capsule())
                Text(label)
                    .font(.bodyFont(10, active ? .bold : .semibold))
                    .foregroundStyle(active ? Candy.ink : Candy.muted)
            }
        }
        .buttonStyle(.plain)
    }
}

// The signature element: a raised lime circle, lifted above the bar, with a
// medium haptic on tap.
private struct MeasureFAB: View {
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ZStack {
                    Circle()
                        .fill(Candy.pop)
                        .frame(width: 58, height: 58)
                        .overlay(Circle().stroke(Candy.surface, lineWidth: 3))
                        .popShadow()
                    Image(systemName: "wand.and.rays")
                        .font(.system(size: 23, weight: .bold))
                        .foregroundStyle(Candy.onPop)
                }
                Text("Measure")
                    .font(.bodyFont(10, .bold))
                    .foregroundStyle(active ? Candy.ink : Candy.subtle)
            }
            .offset(y: -16)
        }
        .buttonStyle(PressableStyle())
    }
}
