import SwiftUI

// History/resume list for the signed-in customer. Authenticated by the app's
// Shopify customerAccessToken (Keychain). Tapping a row resumes that session in
// the result view.
struct MyDesignsView: View {
    @Environment(AuthStore.self) private var auth

    @State private var designs: [DesignSummary] = []
    @State private var loading = false
    @State private var loadError: String?
    @State private var resumeStore: CustomizeStore?

    private let client = CustomizeClient()
    private let tokenKey = "nailismo_customer_token"

    private static let statusLabel: [String: String] = [
        "ready": "Ready — pick your favorite",
        "selected": "Design chosen — finish checkout",
        "ordered": "Ordered 🎉",
        "generating": "Generating…",
        "pending_payment": "Awaiting deposit",
        "refunded": "Refunded",
        "failed": "Generation failed",
    ]

    var body: some View {
        Group {
            if !auth.isSignedIn {
                VStack(spacing: 14) {
                    Eyebrow("your account")
                    Text("Sign in to see your designs").font(.display(22)).foregroundStyle(Candy.ink)
                    AuthView()
                }
                .padding(16)
            } else {
                content
            }
        }
        .task(id: auth.isSignedIn) { await load() }
        .sheet(item: $resumeStore) { store in
            NavigationStack {
                CustomizeResultView()
                    .environment(store)
                    .background(Candy.bg.ignoresSafeArea())
            }
        }
    }

    @ViewBuilder private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("My designs.").font(.display(30)).foregroundStyle(Candy.ink)

                if loading {
                    LoadingRow()
                } else if let loadError {
                    ErrorRow(message: loadError) { Task { await load() } }
                } else if designs.isEmpty {
                    Text("No designs yet. Start your custom set →")
                        .font(.bodyFont(15)).foregroundStyle(Candy.subtle)
                } else {
                    ForEach(designs) { d in
                        Button { resume(d) } label: { row(d) }.buttonStyle(.plain)
                    }
                }
                Color.clear.frame(height: 92)
            }
            .padding(16)
        }
    }

    private func row(_ d: DesignSummary) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: Radius.md).fill(Candy.bg).frame(width: 76, height: 76)
                if let url = d.thumbUrl.flatMap(URL.init) {
                    AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { ProgressView() }
                        .frame(width: 76, height: 76).clipShape(RoundedRectangle(cornerRadius: Radius.md))
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(Self.statusLabel[d.status] ?? d.status).font(.bodyFont(15, .bold)).foregroundStyle(Candy.ink)
                Text("Resume →").font(.bodyFont(13, .semibold)).foregroundStyle(Candy.subtle)
            }
            Spacer()
        }
        .padding(12)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
        .candyShadow()
    }

    private func load() async {
        guard auth.isSignedIn, let token = Keychain.read(tokenKey) else { return }
        loading = true; loadError = nil
        defer { loading = false }
        do {
            designs = try await client.designs(customerToken: token)
        } catch {
            loadError = (error as? LocalizedError)?.errorDescription ?? "Couldn't load your designs."
        }
    }

    private func resume(_ d: DesignSummary) {
        let store = CustomizeStore()
        store.resume(sessionId: d.sessionId)
        resumeStore = store
    }
}

extension CustomizeStore: Identifiable {}
