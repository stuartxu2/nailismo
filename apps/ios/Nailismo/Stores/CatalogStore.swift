import Foundation
import Observation

// Catalog cache shared across Home + Shop. Loads products + collections once.
@MainActor
@Observable
final class CatalogStore {
    var products: [Product] = []
    var collections: [Collection] = []
    var isLoading = false
    var errorMessage: String?
    private var loaded = false

    func loadIfNeeded() async {
        guard !loaded, !isLoading else { return }
        await reload()
    }

    func reload() async {
        isLoading = true
        errorMessage = nil
        do {
            async let prods = StorefrontClient.shared.fetch(
                Queries.products, variables: ["first": 50], as: ProductsData.self
            )
            async let cols = StorefrontClient.shared.fetch(
                Queries.collections, variables: ["first": 12], as: CollectionsData.self
            )
            let (p, c) = try await (prods, cols)
            products = p.products.nodes
            // Keep only collections that have something to show.
            collections = c.collections.nodes.filter { $0.thumbURL != nil }
            loaded = true
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isLoading = false
    }

    /// Most common product tags (for Shop filter chips), excluding noise.
    func topTags(_ limit: Int = 10) -> [String] {
        var counts: [String: Int] = [:]
        for p in products {
            for t in p.tags where !Self.hiddenTags.contains(t.lowercased()) {
                counts[t, default: 0] += 1
            }
        }
        return counts.sorted { $0.value > $1.value || ($0.value == $1.value && $0.key < $1.key) }
            .prefix(limit).map(\.key)
    }

    private static let hiddenTags: Set<String> = ["new arrival", "featured", "best seller", "bestseller"]
}
