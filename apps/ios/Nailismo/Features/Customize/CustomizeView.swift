import SwiftUI
import StripePaymentSheet

// Tab root for the Customize flow. Owns the CustomizeStore + its own
// NavigationStack, sets the Stripe publishable key once, and switches subviews
// on the store phase. A "My designs" link pushes the history list.
struct CustomizeView: View {
    var onSelectTab: (Tab) -> Void = { _ in }

    @State private var store = CustomizeStore()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HeaderBand(eyebrow: "customize to order", title: "Custom") {
                    NavigationLink {
                        MyDesignsView().background(Candy.bg.ignoresSafeArea())
                    } label: {
                        Text("My designs").font(.bodyFont(13, .bold)).foregroundStyle(Candy.onAccent)
                    }
                }
                content
            }
            .background(Candy.bg.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
        .environment(store)
        .onAppear { STPAPIClient.shared.publishableKey = Config.stripePublishableKey }
    }

    @ViewBuilder private var content: some View {
        switch store.phase {
        case .intake, .uploading:
            CustomizeIntakeView()
        case .paying:
            CustomizePayView()
        case .generating, .ready, .failed:
            CustomizeResultView(onMeasure: { onSelectTab(.measure) })
        }
    }
}
