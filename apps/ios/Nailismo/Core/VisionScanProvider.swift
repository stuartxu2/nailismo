import UIKit
import Vision

// On-device scanner — no network. VNDetectRectanglesRequest locates the card,
// VNDetectHumanHandPoseRequest locates the fingers; we synthesize an initial
// width caliper per nail from the tip + DIP joint. The user nudges these in the
// review overlay, exactly like the HTTP path. Same ScanResult contract.
//
// Vision uses normalized coords with a bottom-left origin (y up); the app uses a
// top-left origin (y down), so every point is flipped on y.
struct VisionScanProvider: ScanProvider {
    func detect(_ image: UIImage) async throws -> ScanResult {
        guard let cg = image.cgImage else { throw ScanError.encodeFailed }
        return try await withCheckedThrowingContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                do { cont.resume(returning: try Self.run(cg)) }
                catch { cont.resume(throwing: error) }
            }
        }
    }

    private static func run(_ cg: CGImage) throws -> ScanResult {
        let handler = VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:])

        let rectRequest = VNDetectRectanglesRequest()
        rectRequest.minimumAspectRatio = 0.3
        rectRequest.maximumAspectRatio = 1.0
        rectRequest.minimumSize = 0.1
        rectRequest.minimumConfidence = 0.6
        rectRequest.maximumObservations = 12

        let handRequest = VNDetectHumanHandPoseRequest()
        handRequest.maximumHandCount = 1

        try handler.perform([rectRequest, handRequest])

        let card = bestCardEdge(rectRequest.results ?? [])
        let nails = nailSegments(handRequest.results?.first)

        let found = card != nil && nails.count >= 3
        return ScanResult(found: found, card: found ? card : nil, nails: found ? nails : nil)
    }

    // MARK: Card

    private static func bestCardEdge(_ rects: [VNRectangleObservation]) -> ScanSeg? {
        guard !rects.isEmpty else { return nil }
        // ID-1 card long/short ratio ≈ 1.586.
        func ratio(_ r: VNRectangleObservation) -> CGFloat {
            let top = dist(r.topLeft, r.topRight)
            let left = dist(r.topLeft, r.bottomLeft)
            let long = max(top, left), short = max(min(top, left), 0.0001)
            return long / short
        }
        let cardLike = rects.filter { abs(ratio($0) - 1.586) < 0.4 }
        let pick = (cardLike.isEmpty ? rects : cardLike)
            .max { $0.confidence < $1.confidence }
        guard let r = pick else { return nil }

        let top = dist(r.topLeft, r.topRight)
        let left = dist(r.topLeft, r.bottomLeft)
        let (a, b) = top >= left ? (r.topLeft, r.topRight) : (r.topLeft, r.bottomLeft)
        return ScanSeg(a: flip(a), b: flip(b))
    }

    // MARK: Nails

    private struct Joint {
        let tip: VNHumanHandPoseObservation.JointName
        let base: VNHumanHandPoseObservation.JointName
        let finger: String
    }
    private static let joints: [Joint] = [
        .init(tip: .indexTip, base: .indexDIP, finger: "index"),
        .init(tip: .middleTip, base: .middleDIP, finger: "middle"),
        .init(tip: .ringTip, base: .ringDIP, finger: "ring"),
        .init(tip: .littleTip, base: .littleDIP, finger: "pinky"),
    ]

    private static func nailSegments(_ hand: VNHumanHandPoseObservation?) -> [ScanNail] {
        guard let hand else { return [] }
        var out: [ScanNail] = []
        for j in joints {
            guard let tip = try? hand.recognizedPoint(j.tip),
                  let base = try? hand.recognizedPoint(j.base),
                  tip.confidence > 0.3, base.confidence > 0.3 else { continue }

            // Work in top-left coords.
            let t = flipPoint(tip.location)
            let d = flipPoint(base.location)
            let axis = normalize(CGPoint(x: t.x - d.x, y: t.y - d.y))
            let perp = CGPoint(x: -axis.y, y: axis.x)
            // Nail bed sits a little back from the tip toward the DIP joint.
            let center = CGPoint(x: t.x * 0.7 + d.x * 0.3, y: t.y * 0.7 + d.y * 0.3)
            let halfW = 0.5 * dist(t, d)
            let a = clamp01(CGPoint(x: center.x + perp.x * halfW, y: center.y + perp.y * halfW))
            let b = clamp01(CGPoint(x: center.x - perp.x * halfW, y: center.y - perp.y * halfW))
            out.append(ScanNail(
                finger: j.finger,
                a: [Double(a.x), Double(a.y)],
                b: [Double(b.x), Double(b.y)],
                confidence: Double(min(tip.confidence, base.confidence))
            ))
        }
        return out
    }

    // MARK: Geometry helpers

    private static func dist(_ a: CGPoint, _ b: CGPoint) -> CGFloat { hypot(b.x - a.x, b.y - a.y) }
    private static func normalize(_ v: CGPoint) -> CGPoint {
        let m = max(hypot(v.x, v.y), 0.0001)
        return CGPoint(x: v.x / m, y: v.y / m)
    }
    private static func clamp01(_ p: CGPoint) -> CGPoint {
        CGPoint(x: min(max(0, p.x), 1), y: min(max(0, p.y), 1))
    }
    /// Vision point (bottom-left origin) -> ScanSeg array (top-left origin).
    private static func flip(_ p: CGPoint) -> [Double] { [Double(p.x), Double(1 - p.y)] }
    private static func flipPoint(_ p: CGPoint) -> CGPoint { CGPoint(x: p.x, y: 1 - p.y) }
}

// Vision first (instant, offline); fall back to the hosted /api/scan if the
// on-device pass can't find the card + nails.
struct HybridScanProvider: ScanProvider {
    private let vision = VisionScanProvider()
    private let http = HTTPScanProvider()

    func detect(_ image: UIImage) async throws -> ScanResult {
        if let local = try? await vision.detect(image), local.found {
            return local
        }
        return try await http.detect(image)
    }
}
