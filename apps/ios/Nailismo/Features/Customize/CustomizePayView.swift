import SwiftUI
import StripePaymentSheet

// Presents the native Stripe PaymentSheet for the $2 deposit using the
// PaymentIntent client secret. On success, the store starts polling /status
// (generation is fired by the Stripe webhook server-side).
struct CustomizePayView: View {
    @Environment(CustomizeStore.self) private var store
    @State private var sheet: PaymentSheet?
    @State private var presenting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow("hold your spot")
            Text("$2 to generate — credited to your set 💸")
                .font(.display(26)).foregroundStyle(Candy.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("Credited straight to your $69 set when you order.")
                .font(.bodyFont(14)).foregroundStyle(Candy.subtle)

            if let error = store.errorMessage {
                Text(error).font(.bodyFont(13, .semibold)).foregroundStyle(Color(hex: "C0392B"))
            }

            CandyButton(title: "Pay $2 & generate", variant: .pop) { present() }

            VStack(alignment: .leading, spacing: 6) {
                Text("↺ $2 comes off your $69 order automatically")
                Text("🎨 Your custom design in 3 views, yours to keep")
            }
            .font(.bodyFont(13, .bold)).foregroundStyle(Candy.subtle)

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .onAppear(perform: buildSheet)
    }

    private func buildSheet() {
        guard let clientSecret = store.clientSecret, sheet == nil else { return }
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = "Nailismo"
        config.primaryButtonColor = UIColor(Candy.pop)
        sheet = PaymentSheet(paymentIntentClientSecret: clientSecret, configuration: config)
    }

    private func present() {
        guard let sheet,
              let root = UIApplication.shared.connectedScenes
                .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
                .first?.rootViewController?.topMostPresented
        else { return }
        sheet.present(from: root) { result in
            switch result {
            case .completed: store.paymentCompleted()
            case .canceled: break // stay on the pay screen
            case .failed(let error): store.paymentCanceled(message: error.localizedDescription)
            }
        }
    }
}

private extension UIViewController {
    var topMostPresented: UIViewController {
        var vc = self
        while let p = vc.presentedViewController { vc = p }
        return vc
    }
}
