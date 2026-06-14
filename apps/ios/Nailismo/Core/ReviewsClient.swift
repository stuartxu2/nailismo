import Foundation

// Reads PDP reviews from the web app's /api/reviews BFF (apps/web). The Judge.me
// private token lives only on the server, so — like the /api/scan measure flow —
// the app never talks to Judge.me directly. Failures degrade to the no-reviews
// state (the PDP simply hides the section), matching the web RSC.
struct ReviewsClient {
    static let shared = ReviewsClient()

    func fetch(productId: String) async -> ReviewsResponse {
        let empty = ReviewsResponse(reviews: [], aggregate: nil)
        guard
            let encoded = productId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
            let url = URL(string: "\(Config.scanBaseURL.absoluteString)/api/reviews?productId=\(encoded)")
        else { return empty }

        do {
            var req = URLRequest(url: url)
            req.timeoutInterval = 12
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                return empty
            }
            return try JSONDecoder().decode(ReviewsResponse.self, from: data)
        } catch {
            return empty
        }
    }
}
