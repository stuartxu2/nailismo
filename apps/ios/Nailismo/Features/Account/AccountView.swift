import SwiftUI

struct AccountView: View {
    var onSelectTab: (Tab) -> Void = { _ in }
    @State private var showDesigns = false
    @Environment(FavoritesStore.self) private var favorites
    @Environment(FitStore.self) private var fit
    @Environment(AuthStore.self) private var auth

    var body: some View {
        VStack(spacing: 0) {
            HeaderBand(eyebrow: "you", title: "Account")

            ScrollView {
                VStack(spacing: 16) {
                    profileHeader

                    if !auth.isSignedIn {
                        AuthView()
                    }

                    quickLinks

                    if let orders = auth.customer?.orders.nodes, !orders.isEmpty {
                        ordersSection(orders)
                    }

                    promo

                    if auth.isSignedIn {
                        CandyButton(title: "Sign out", variant: .ghost) {
                            Task { await auth.signOut() }
                        }
                    }

                    Color.clear.frame(height: 92)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
            }
        }
        .background(Candy.bg)
        .sheet(isPresented: $showDesigns) {
            NavigationStack {
                MyDesignsView().background(Candy.bg.ignoresSafeArea())
            }
        }
    }

    private var profileHeader: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle().fill(Candy.surface).frame(width: 84, height: 84).candyShadow()
                Text(auth.customer?.initial ?? "N")
                    .font(.display(34)).foregroundStyle(Candy.muted)
            }
            Text(auth.customer?.greetingName ?? "Guest")
                .font(.display(22)).foregroundStyle(Candy.ink)
            if let email = auth.customer?.email {
                Text(email).font(.bodyFont(13)).foregroundStyle(Candy.subtle)
            }
        }
        .padding(.top, 8)
    }

    private var quickLinks: some View {
        VStack(spacing: 0) {
            AccountRow(icon: "ruler", title: "Your size",
                       subtitle: fit.size.map { "Size \($0)" } ?? "Measure to save it") { onSelectTab(.measure) }
            Divider().background(Candy.border)
            AccountRow(icon: "heart", title: "Favorites",
                       subtitle: favorites.items.isEmpty ? "Nothing saved yet" : "\(favorites.items.count) saved") { onSelectTab(.favorites) }
            Divider().background(Candy.border)
            AccountRow(icon: "sparkles", title: "My custom designs",
                       subtitle: "Your AI custom sets") { showDesigns = true }
            Divider().background(Candy.border)
            AccountRow(icon: "shippingbox", title: "Orders",
                       subtitle: auth.isSignedIn ? "\(auth.customer?.orders.nodes.count ?? 0) total" : "Sign in to view")
            Divider().background(Candy.border)
            AccountRow(icon: "sparkles", title: "About Nailismo")
        }
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
        .candyShadow()
    }

    private func ordersSection(_ orders: [CustomerOrder]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow("recent orders")
            VStack(spacing: 0) {
                ForEach(orders.prefix(8)) { order in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(order.name).font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                            Text(shortDate(order.processedAt)).font(.bodyFont(12)).foregroundStyle(Candy.subtle)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 3) {
                            Text(order.currentTotalPrice.formatted)
                                .font(.bodyFont(14, .bold)).foregroundStyle(Candy.accent)
                            Text(statusText(order)).font(.bodyFont(11, .semibold)).foregroundStyle(Candy.muted)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    if order.id != orders.prefix(8).last?.id {
                        Divider().background(Candy.border)
                    }
                }
            }
            .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
            .candyShadow()
        }
    }

    private var promo: some View {
        HStack(spacing: 12) {
            Image(systemName: "gift.fill").foregroundStyle(Candy.ink)
            VStack(alignment: .leading, spacing: 2) {
                Text("Candy club").font(.bodyFont(14, .bold)).foregroundStyle(Candy.ink)
                Text("Free shipping over $35").font(.bodyFont(12)).foregroundStyle(Candy.ink.opacity(0.7))
            }
            Spacer()
        }
        .padding(16)
        .background(Candy.pop, in: RoundedRectangle(cornerRadius: Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.ink, lineWidth: 1.5))
    }

    private func statusText(_ order: CustomerOrder) -> String {
        let raw = order.fulfillmentStatus ?? order.financialStatus ?? ""
        return raw.replacingOccurrences(of: "_", with: " ").capitalized
    }

    private func shortDate(_ iso: String) -> String {
        let parsers = [ISO8601DateFormatter.withFraction, ISO8601DateFormatter.plain]
        for p in parsers {
            if let date = p.date(from: iso) {
                let out = DateFormatter()
                out.dateStyle = .medium
                return out.string(from: date)
            }
        }
        return ""
    }
}

private extension ISO8601DateFormatter {
    static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
    static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}

struct AccountRow: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Candy.accent)
                    .frame(width: 26)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                    if let subtitle {
                        Text(subtitle).font(.bodyFont(12)).foregroundStyle(Candy.subtle)
                    }
                }
                Spacer()
                if action != nil {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Candy.border)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 15)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}
