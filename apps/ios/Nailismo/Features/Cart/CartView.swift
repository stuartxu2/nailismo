import SwiftUI

struct CartView: View {
    @Environment(CartStore.self) private var cart
    @Environment(\.dismiss) private var dismiss
    @State private var checkoutURL: URL?
    @State private var showCheckout = false

    private var lines: [CartLine] { cart.cart?.lines.nodes ?? [] }

    var body: some View {
        VStack(spacing: 0) {
            HeaderBand(eyebrow: "your bag", title: "Cart") {
                IconButton(systemName: "xmark") { dismiss() }
            }

            if lines.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(lines) { line in
                            CartLineRow(line: line)
                        }
                    }
                    .padding(16)
                }
                footer
            }
        }
        .background(Candy.bg.ignoresSafeArea())
        .sheet(isPresented: $showCheckout) {
            if let checkoutURL {
                SafariView(url: checkoutURL).ignoresSafeArea()
            }
        }
    }

    private var footer: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Subtotal").font(.bodyFont(15, .semibold)).foregroundStyle(Candy.subtle)
                Spacer()
                Text(cart.cart?.cost.subtotalAmount.formatted ?? "—")
                    .font(.display(22)).foregroundStyle(Candy.ink)
            }
            CandyButton(title: "Checkout", variant: .pop) {
                if let url = cart.checkoutURL {
                    checkoutURL = url
                    showCheckout = true
                }
            }
        }
        .padding(16)
        .background(Candy.surface.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) { Rectangle().fill(Candy.border).frame(height: 1) }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()
            ZStack {
                Circle().fill(Candy.surface).frame(width: 96, height: 96).candyShadow()
                Image(systemName: "bag").font(.system(size: 36, weight: .semibold)).foregroundStyle(Candy.muted)
            }
            Text("Your bag is empty").font(.display(24)).foregroundStyle(Candy.ink)
            Text("Go pick a flavor.").font(.bodyFont(15)).foregroundStyle(Candy.subtle)
            CandyButton(title: "Done", variant: .ink) { dismiss() }.frame(maxWidth: 180)
            Spacer(); Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct CartLineRow: View {
    let line: CartLine
    @Environment(CartStore.self) private var cart

    private var sizeValue: String? {
        line.merchandise.selectedOptions.first { $0.name == "Size" }?.value
    }

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: line.merchandise.image?.asURL) { image in
                image.resizable().scaledToFill()
            } placeholder: { Candy.bg }
            .frame(width: 72, height: 72)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))

            VStack(alignment: .leading, spacing: 4) {
                Text(line.merchandise.product.title)
                    .font(.display(15, .semibold)).foregroundStyle(Candy.ink).lineLimit(1)
                if let sizeValue {
                    Text("Size \(sizeValue)").font(.bodyFont(13)).foregroundStyle(Candy.subtle)
                }
                Text(line.cost.totalAmount.formatted)
                    .font(.bodyFont(14, .bold)).foregroundStyle(Candy.accent)

                HStack(spacing: 12) {
                    stepper("minus") { Task { await cart.updateLine(line.id, quantity: line.quantity - 1) } }
                    Text("\(line.quantity)")
                        .font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                        .frame(minWidth: 18)
                    stepper("plus") { Task { await cart.updateLine(line.id, quantity: line.quantity + 1) } }
                    Spacer()
                    Button {
                        Task { await cart.removeLine(line.id) }
                    } label: {
                        Text("Remove").font(.bodyFont(13, .semibold)).foregroundStyle(Candy.subtle)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 2)
            }
        }
        .padding(10)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
        .softShadow()
    }

    private func stepper(_ symbol: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Candy.ink)
                .frame(width: 30, height: 30)
                .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.sm))
                .overlay(RoundedRectangle(cornerRadius: Radius.sm).stroke(Candy.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
