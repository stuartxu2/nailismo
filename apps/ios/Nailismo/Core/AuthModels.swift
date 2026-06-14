import Foundation

struct CustomerAccessToken: Codable, Hashable {
    let accessToken: String
    let expiresAt: String
}

struct CustomerUserError: Codable, Hashable {
    let code: String?
    let field: [String]?
    let message: String
}

struct CustomerRef: Codable, Hashable {
    let id: String
    let email: String?
}

struct CustomerOrder: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let processedAt: String
    let financialStatus: String?
    let fulfillmentStatus: String?
    let currentTotalPrice: Money
}

struct Customer: Codable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?
    let displayName: String?
    let email: String?
    let orders: NodeList<CustomerOrder>

    var greetingName: String {
        if let first = firstName, !first.isEmpty { return first }
        if let display = displayName, !display.isEmpty { return display }
        return email ?? "You"
    }
    var initial: String { String(greetingName.first ?? "N").uppercased() }
}

// Envelopes
struct TokenCreatePayload: Codable {
    let customerAccessToken: CustomerAccessToken?
    let customerUserErrors: [CustomerUserError]
}
struct TokenCreateData: Codable { let customerAccessTokenCreate: TokenCreatePayload }

struct CustomerCreatePayload: Codable {
    let customer: CustomerRef?
    let customerUserErrors: [CustomerUserError]
}
struct CustomerCreateData: Codable { let customerCreate: CustomerCreatePayload }

struct CustomerData: Codable { let customer: Customer? }

struct TokenDeletePayload: Codable { let deletedAccessToken: String? }
struct TokenDeleteData: Codable { let customerAccessTokenDelete: TokenDeletePayload? }
