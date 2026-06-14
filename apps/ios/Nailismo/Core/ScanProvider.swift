import UIKit

// Detection result from the scanner — normalized [0,1] image coordinates.
// Mirrors the /api/scan response (apps/web/app/api/scan/route.ts).
struct ScanSeg: Codable { let a: [Double]; let b: [Double] }
struct ScanNail: Codable { let finger: String; let a: [Double]; let b: [Double]; let confidence: Double? }
struct ScanResult: Codable {
    let found: Bool
    let card: ScanSeg?
    let nails: [ScanNail]?
}

enum ScanError: LocalizedError {
    case encodeFailed
    case http(Int)
    var errorDescription: String? {
        switch self {
        case .encodeFailed: return "Couldn't read that photo."
        case .http(let c): return "Scan failed (\(c))."
        }
    }
}

// Pluggable so a native Vision implementation can swap in later without touching
// the UI.
protocol ScanProvider {
    func detect(_ image: UIImage) async throws -> ScanResult
}

// Reuses the web /api/scan endpoint (Gemini via Vercel AI Gateway).
struct HTTPScanProvider: ScanProvider {
    func detect(_ image: UIImage) async throws -> ScanResult {
        guard let jpeg = image.jpegData(compressionQuality: 0.7) else { throw ScanError.encodeFailed }
        let dataURL = "data:image/jpeg;base64," + jpeg.base64EncodedString()

        let url = URL(string: "https://\(Config.scanHost)/api/scan")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["image": dataURL])
        req.timeoutInterval = 45

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw ScanError.http(0) }
        guard (200..<300).contains(http.statusCode) else { throw ScanError.http(http.statusCode) }
        return try JSONDecoder().decode(ScanResult.self, from: data)
    }
}

extension UIImage {
    /// Downscale to <= maxEdge on the longest side and bake EXIF orientation, so
    /// the pixels match the coordinates the detector returns and the overlay
    /// draws on. Mirrors processImage() in apps/app/src/lib/scan.ts.
    func processedForScan(maxEdge: CGFloat = 1280) -> UIImage {
        let longest = max(size.width, size.height)
        let scale = longest > maxEdge ? maxEdge / longest : 1
        let newSize = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1 // pixel size == point size, so jpeg pixels match the box math
        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        return renderer.image { _ in draw(in: CGRect(origin: .zero, size: newSize)) }
    }
}
