import UIKit

// Networking for the Customize flow. A protocol so CustomizeStore can be unit
// tested with a stub. Live impl mirrors HTTPScanProvider's style.
protocol CustomizeClienting {
    func upload(imageDataURL: String, shape: String, note: String?, email: String?) async throws -> UploadResp
    func intent(sessionId: String) async throws -> IntentResp
    func status(sessionId: String) async throws -> StatusResp
    func select(sessionId: String, size: String) async throws -> SelectResp
    func designs(customerToken: String) async throws -> [DesignSummary]
}

struct CustomizeClient: CustomizeClienting {
    private var base: String { "https://\(Config.scanHost)/api/customize" }

    func upload(imageDataURL: String, shape: String, note: String?, email: String?) async throws -> UploadResp {
        var body: [String: Any] = ["image": imageDataURL, "shape": shape]
        if let note, !note.isEmpty { body["note"] = note }
        if let email, !email.isEmpty { body["email"] = email }
        return try await post("\(base)/upload", body: body, timeout: 45)
    }

    func intent(sessionId: String) async throws -> IntentResp {
        try await post("\(base)/intent", body: ["sessionId": sessionId])
    }

    func status(sessionId: String) async throws -> StatusResp {
        try await get("\(base)/status/\(sessionId)")
    }

    func select(sessionId: String, size: String) async throws -> SelectResp {
        try await post("\(base)/select", body: ["sessionId": sessionId, "size": size])
    }

    func designs(customerToken: String) async throws -> [DesignSummary] {
        let resp: DesignsResp = try await get(
            "\(base)/designs",
            headers: ["x-shopify-customer-token": customerToken],
        )
        return resp.designs
    }

    // MARK: - HTTP

    private func post<T: Decodable>(_ urlString: String, body: [String: Any], timeout: TimeInterval = 30) async throws -> T {
        var req = URLRequest(url: URL(string: urlString)!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        req.timeoutInterval = timeout
        return try await send(req)
    }

    private func get<T: Decodable>(_ urlString: String, headers: [String: String] = [:]) async throws -> T {
        var req = URLRequest(url: URL(string: urlString)!)
        req.httpMethod = "GET"
        req.cachePolicy = .reloadIgnoringLocalCacheData
        for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        req.timeoutInterval = 30
        return try await send(req)
    }

    private func send<T: Decodable>(_ req: URLRequest) async throws -> T {
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
            throw CustomizeError(status: code, message: msg ?? "Something went wrong (\(code)).")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
