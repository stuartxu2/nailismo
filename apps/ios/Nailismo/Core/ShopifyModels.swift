import Foundation

// Codable mirrors of the Storefront shapes used by the app — a subset of
// packages/shopify/src/types.ts. Storefront field names are camelCase, so the
// default decoder maps them directly; unrequested/extra fields are ignored.

struct Money: Codable, Hashable {
    let amount: String
    let currencyCode: String

    var formatted: String {
        let n = Double(amount) ?? 0
        let prefix = currencyCode == "USD" ? "$" : "\(currencyCode) "
        return prefix + String(format: "%.2f", n)
    }
}

struct ImageRef: Codable, Hashable {
    let url: String
    let altText: String?
    var asURL: URL? { URL(string: url) }
}

struct PriceRange: Codable, Hashable {
    let minVariantPrice: Money
}

struct SelectedOption: Codable, Hashable {
    let name: String
    let value: String
}

struct VariantRef: Codable, Hashable {
    let id: String
    let availableForSale: Bool
    let selectedOptions: [SelectedOption]?
}

struct NodeList<T: Codable & Hashable>: Codable, Hashable {
    let nodes: [T]
}

struct Product: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let handle: String
    let productType: String?
    let tags: [String]
    let featuredImage: ImageRef?
    let priceRange: PriceRange
    let variants: NodeList<VariantRef>?

    var price: String { priceRange.minVariantPrice.formatted }
    var inStock: Bool { variants?.nodes.contains { $0.availableForSale } ?? true }
}

// --- Product detail ---

struct ProductOption: Codable, Hashable {
    let id: String
    let name: String
    let values: [String]
}

struct VariantDetail: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let availableForSale: Bool
    let selectedOptions: [SelectedOption]
    let price: Money
}

struct ProductDetail: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let handle: String
    let descriptionHtml: String
    let productType: String?
    let isGiftCard: Bool?
    let tags: [String]
    let featuredImage: ImageRef?
    let images: NodeList<ImageRef>
    let options: [ProductOption]
    let priceRange: PriceRange
    let variants: NodeList<VariantDetail>

    var sizeOption: ProductOption? { options.first { $0.name == "Size" } }

    // Which PDP template this product renders with, mirroring the web app's
    // lib/shopify/product-class.ts. Gift cards and care essentials drop the
    // sizing/press-on chrome for the leaner SimpleProduct layout.
    var productClass: ProductClass {
        if isGiftCard == true { return .gift }
        if ProductClass.essentialHandles.contains(handle) { return .essential }
        return .nail
    }

    func variant(forSize size: String?) -> VariantDetail? {
        if let sizeOption, let size {
            let matches = variants.nodes.filter {
                $0.selectedOptions.contains { $0.name == "Size" && $0.value == size }
            }
            _ = sizeOption
            return matches.first { $0.availableForSale } ?? matches.first
        }
        return variants.nodes.first { $0.availableForSale } ?? variants.nodes.first
    }
}

// --- Collections ---

struct CollectionProductImage: Codable, Hashable {
    let featuredImage: ImageRef?
}

struct Collection: Codable, Hashable, Identifiable {
    let id: String
    let handle: String
    let title: String
    let description: String?
    let image: ImageRef?
    let products: NodeList<CollectionProductImage>?

    var thumbURL: URL? {
        URL(string: image?.url ?? products?.nodes.first?.featuredImage?.url ?? "")
    }
}

// --- Product classification (mirrors web lib/shopify/product-class.ts) ---

enum ProductClass {
    case nail, essential, gift

    // Care-essential handles carry no productType/tags to key off, so — like the
    // web inclusion list — they're enumerated. Keep in sync with ESSENTIAL_HANDLES.
    static let essentialHandles: Set<String> = ["nail-glue", "glue-remover"]
}

// --- Reviews (served by the web /api/reviews BFF; shape mirrors reviews.ts) ---

struct Review: Codable, Hashable, Identifiable {
    let author: String
    let rating: Int
    let title: String?
    let body: String
    let date: String
    let verified: Bool?
    let incentivized: Bool?

    var id: String { "\(author)-\(date)-\(body.prefix(16))" }
}

struct ReviewAggregate: Codable, Hashable {
    let ratingValue: Double
    let reviewCount: Int
}

struct ReviewsResponse: Codable {
    let reviews: [Review]
    let aggregate: ReviewAggregate?
}

// --- GraphQL envelopes ---

struct GraphQLResponse<T: Codable>: Codable {
    let data: T?
    let errors: [GraphQLErrorMessage]?
}
struct GraphQLErrorMessage: Codable { let message: String }

struct ProductsData: Codable { let products: NodeList<Product> }
struct ProductData: Codable { let product: ProductDetail? }
struct CollectionsData: Codable { let collections: NodeList<Collection> }
struct RecommendationsData: Codable { let productRecommendations: [Product]? }

// Lightweight value used to push a product onto a NavigationStack.
struct ProductRoute: Hashable { let handle: String }

// HTML -> plain text for product descriptions.
func plainText(fromHTML html: String) -> String {
    html
        .replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        .replacingOccurrences(of: "&amp;", with: "&")
        .replacingOccurrences(of: "&nbsp;", with: " ")
        .replacingOccurrences(of: "&#39;", with: "'")
        .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespacesAndNewlines)
}
