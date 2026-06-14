import Foundation

enum StorefrontError: LocalizedError {
    case notConfigured
    case http(Int)
    case graphql(String)
    case noData

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "Shopify is not configured (missing Secrets.xcconfig)."
        case .http(let code): return "Storefront HTTP \(code)."
        case .graphql(let msg): return "Storefront error: \(msg)"
        case .noData: return "Storefront response had no data."
        }
    }
}

// Minimal async Storefront GraphQL client (URLSession). Mirrors
// packages/shopify/src/client.ts: POST to /api/{version}/graphql.json with the
// public token header.
struct StorefrontClient {
    static let shared = StorefrontClient()

    func fetch<T: Codable>(
        _ query: String,
        variables: [String: Any] = [:],
        as type: T.Type
    ) async throws -> T {
        guard Config.isConfigured else { throw StorefrontError.notConfigured }

        let url = URL(string: "https://\(Config.storeDomain)/api/\(Config.apiVersion)/graphql.json")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(Config.storefrontToken, forHTTPHeaderField: "X-Shopify-Storefront-Access-Token")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["query": query, "variables": variables])

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw StorefrontError.http(0) }
        guard (200..<300).contains(http.statusCode) else { throw StorefrontError.http(http.statusCode) }

        let decoded = try JSONDecoder().decode(GraphQLResponse<T>.self, from: data)
        if let errors = decoded.errors, !errors.isEmpty {
            throw StorefrontError.graphql(errors.map(\.message).joined(separator: "; "))
        }
        guard let payload = decoded.data else { throw StorefrontError.noData }
        return payload
    }
}
