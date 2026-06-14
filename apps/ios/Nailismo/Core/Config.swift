import Foundation

// Runtime config, surfaced from Secrets.xcconfig -> Info.plist build settings.
// The Storefront token is the PUBLIC, client-safe token. Never log these values.
enum Config {
    static let storeDomain = info("ShopifyStoreDomain")
    static let storefrontToken = info("ShopifyStorefrontToken")
    static let apiVersion = infoOr("ShopifyApiVersion", "2026-01")
    static let scanHost = infoOr("ScanApiHost", "nailismo.com")

    static var scanBaseURL: URL { URL(string: "https://\(scanHost)")! }
    static var isConfigured: Bool { !storeDomain.isEmpty && !storefrontToken.isEmpty }

    private static func info(_ key: String) -> String {
        (Bundle.main.object(forInfoDictionaryKey: key) as? String) ?? ""
    }
    private static func infoOr(_ key: String, _ fallback: String) -> String {
        let v = info(key)
        return v.isEmpty ? fallback : v
    }
}
