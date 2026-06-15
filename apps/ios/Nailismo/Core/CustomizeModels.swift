import Foundation

// DTOs for the web Customize BFF (apps/web/app/api/customize/*) + the designs
// feed (apps/web/app/api/customize/designs). Field names match the JSON exactly.

struct UploadResp: Decodable { let sessionId: String; let uploadUrl: String? }
struct IntentResp: Decodable { let clientSecret: String }

struct CustomizeJob: Decodable, Hashable {
    let status: String        // "pending" | "ready" | "failed"
    let resultUrl: String?
}

struct StatusResp: Decodable {
    let status: String        // see SessionStatus in the web types
    let jobs: [CustomizeJob]
}

struct SelectResp: Decodable { let checkoutUrl: String }

struct DesignSummary: Decodable, Identifiable, Hashable {
    let sessionId: String
    let status: String
    let thumbUrl: String?
    var id: String { sessionId }
}

struct DesignsResp: Decodable { let designs: [DesignSummary] }

// Server error body shape: { "error": "..." }.
struct CustomizeError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}
