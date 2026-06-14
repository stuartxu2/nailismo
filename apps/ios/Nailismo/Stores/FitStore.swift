import Foundation
import Observation

// Saved fit — the calibrated card width (px in the captured photo) and per-finger
// nail widths (mm), persisted so a user's size is remembered. Mirrors the RN
// store/fit.ts + SavedFit shape.
@MainActor
@Observable
final class FitStore {
    var cardPxWidth: Double?
    var fingerMm: [String: Double] = [:]
    private let key = "nailismo_fit_v1"

    var size: String? { FitSizing.sizeFromMeasurements(fingerMm) }

    init() { load() }

    func apply(cardPxWidth: Double, fingerMm: [String: Double]) {
        self.cardPxWidth = cardPxWidth
        self.fingerMm = fingerMm
        save()
    }

    func reset() {
        cardPxWidth = nil
        fingerMm = [:]
        UserDefaults.standard.removeObject(forKey: key)
    }

    private struct Saved: Codable {
        let version: Int
        let cardPxWidth: Double?
        let fingerMm: [String: Double]
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let parsed = try? JSONDecoder().decode(Saved.self, from: data),
              parsed.version == 1 else { return }
        cardPxWidth = parsed.cardPxWidth
        fingerMm = parsed.fingerMm
    }

    private func save() {
        let saved = Saved(version: 1, cardPxWidth: cardPxWidth, fingerMm: fingerMm)
        if let data = try? JSONEncoder().encode(saved) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
