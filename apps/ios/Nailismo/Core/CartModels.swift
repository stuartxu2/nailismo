import Foundation

// Cart Codable shapes — mirror packages/shopify CART_FRAGMENT. `merchandise` is
// a ProductVariant (inline fragment) whose fields decode directly.
struct CartCost: Codable, Hashable {
    let subtotalAmount: Money
    let totalAmount: Money
}

struct CartLineCost: Codable, Hashable {
    let totalAmount: Money
}

struct CartProductRef: Codable, Hashable {
    let handle: String
    let title: String
}

struct CartMerchandise: Codable, Hashable {
    let id: String
    let title: String
    let image: ImageRef?
    let product: CartProductRef
    let price: Money
    let selectedOptions: [SelectedOption]
}

struct CartLine: Codable, Hashable, Identifiable {
    let id: String
    let quantity: Int
    let cost: CartLineCost
    let merchandise: CartMerchandise
}

struct Cart: Codable, Hashable {
    let id: String
    let checkoutUrl: String
    let totalQuantity: Int
    let cost: CartCost
    let lines: NodeList<CartLine>
}

// Envelopes
struct CartData: Codable { let cart: Cart? }
struct CartMutationPayload: Codable { let cart: Cart? }
struct CartCreateData: Codable { let cartCreate: CartMutationPayload }
struct CartLinesAddData: Codable { let cartLinesAdd: CartMutationPayload }
struct CartLinesUpdateData: Codable { let cartLinesUpdate: CartMutationPayload }
struct CartLinesRemoveData: Codable { let cartLinesRemove: CartMutationPayload }
