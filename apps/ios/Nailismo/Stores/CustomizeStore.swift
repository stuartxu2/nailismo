import Foundation
import Observation

// One customize session, as a small state machine. Pure status→phase mapping is
// synchronous and unit-tested; network actions drive it. Generation itself is
// triggered server-side by the Stripe webhook — this only polls /status.
@MainActor
@Observable
final class CustomizeStore {
    enum Phase { case intake, uploading, paying, generating, ready, failed }

    var phase: Phase = .intake
    var sessionId: String?
    var clientSecret: String?
    var status: String = "pending_payment"
    var jobs: [CustomizeJob] = []
    var selectedSize: String?
    var errorMessage: String?

    private let client: CustomizeClienting
    private var pollTask: Task<Void, Never>?
    private let pollNanos: UInt64

    init(client: CustomizeClienting = CustomizeClient(), pollSeconds: Double = 2.5) {
        self.client = client
        self.pollNanos = UInt64(pollSeconds * 1_000_000_000)
    }

    // MARK: - Derived

    var hasReadyDesign: Bool { jobs.contains { $0.status == "ready" && $0.resultUrl != nil } }
    var isTerminal: Bool { ["ready", "selected", "ordered", "failed", "refunded"].contains(status) }
    var canOrder: Bool { selectedSize != nil && hasReadyDesign && (status == "ready" || status == "selected") }

    // Pure mapping — unit tested.
    func applyStatus(_ resp: StatusResp) {
        status = resp.status
        jobs = resp.jobs
        switch resp.status {
        case "ready", "selected", "ordered": phase = .ready
        case "failed", "refunded": phase = .failed
        default: phase = .generating
        }
    }

    // MARK: - Actions

    /// Upload the reference + create the $2 PaymentIntent. Advances to `.paying`
    /// on success so the view can present the Stripe sheet with `clientSecret`.
    func beginPayment(imageDataURL: String, shape: String, note: String?, email: String?, style: [String: String]) async {
        guard phase == .intake else { return }
        phase = .uploading
        errorMessage = nil
        do {
            let up = try await client.upload(imageDataURL: imageDataURL, shape: shape, note: note, email: email, style: style)
            let intent = try await client.intent(sessionId: up.sessionId)
            sessionId = up.sessionId
            clientSecret = intent.clientSecret
            phase = .paying
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Something went wrong."
            phase = .intake
        }
    }

    /// Stripe sheet completed — generation is firing server-side; start polling.
    func paymentCompleted() {
        guard let sessionId else { return }
        status = "generating"
        phase = .generating
        startPolling(sessionId: sessionId)
    }

    /// Stripe sheet canceled/failed — no charge; return to intake.
    func paymentCanceled(message: String? = nil) {
        errorMessage = message
        phase = .intake
    }

    /// Resume an existing session (from My designs): adopt its id and poll/show.
    func resume(sessionId id: String) {
        sessionId = id
        phase = .generating
        startPolling(sessionId: id)
    }

    private func startPolling(sessionId id: String) {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                if let resp = try? await self.client.status(sessionId: id) {
                    self.applyStatus(resp)
                    if self.isTerminal { break }
                }
                try? await Task.sleep(nanoseconds: self.pollNanos)
            }
        }
    }

    /// Confirm size → mint code + Shopify checkout URL.
    func order() async -> URL? {
        guard let sessionId, let size = selectedSize else { return nil }
        errorMessage = nil
        do {
            let sel = try await client.select(sessionId: sessionId, size: size)
            return URL(string: sel.checkoutUrl)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Couldn't start checkout — please retry."
            return nil
        }
    }

    func reset() {
        pollTask?.cancel()
        pollTask = nil
        phase = .intake
        sessionId = nil
        clientSecret = nil
        status = "pending_payment"
        jobs = []
        selectedSize = nil
        errorMessage = nil
    }
}
