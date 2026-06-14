import Foundation
import Observation

// Local wishlist — full Product snapshots keyed by handle, persisted to
// UserDefaults so the Favorite tab renders offline. Mirrors the RN favorites
// store's intent (zustand + AsyncStorage).
@MainActor
@Observable
final class FavoritesStore {
    private(set) var items: [Product] = []
    private let key = "nailismo_favorites_v1"

    init() { load() }

    func has(_ product: Product) -> Bool {
        items.contains { $0.handle == product.handle }
    }

    func toggle(_ product: Product) {
        if let idx = items.firstIndex(where: { $0.handle == product.handle }) {
            items.remove(at: idx)
        } else {
            items.insert(product, at: 0)
        }
        save()
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode([Product].self, from: data) else { return }
        items = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(items) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}
