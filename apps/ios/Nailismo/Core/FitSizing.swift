import Foundation

// Press-on nail sizing — ported verbatim from packages/fit-sizing/src/index.ts.
// Calibrate once against a bank/ID card (85.6mm), derive px->mm, match each nail
// against the printed S/M/L/XL chart, aggregate into one set size.
enum FitSizing {
    static let fingers = ["thumb", "index", "middle", "ring", "pinky"]
    static let setSizes = ["S", "M", "L", "XL"]

    /// ISO/IEC 7810 ID-1 card width in mm — the calibration reference.
    static let cardWidthMM: Double = 85.6

    /// Nail-bed width (mm) per finger, per set size. +1mm per size step.
    static let chart: [String: [String: Double]] = [
        "thumb": ["S": 14, "M": 15, "L": 16, "XL": 17],
        "index": ["S": 10, "M": 11, "L": 12, "XL": 13],
        "middle": ["S": 11, "M": 12, "L": 13, "XL": 14],
        "ring": ["S": 10, "M": 11, "L": 12, "XL": 13],
        "pinky": ["S": 7, "M": 8, "L": 9, "XL": 10],
    ]

    static let minMM: Double = 5
    static let maxMM: Double = 20

    static func pxPerMm(_ cardPixelWidth: Double) -> Double { cardPixelWidth / cardWidthMM }

    static func pxToMm(_ px: Double, factor: Double) -> Double {
        factor <= 0 ? 0 : px / factor
    }

    static func clampMm(_ mm: Double) -> Double { min(maxMM, max(minMM, mm)) }

    /// Continuous set-size position (0=S … 3=XL) for one finger at a width.
    private static func sizeIndex(_ finger: String, _ mm: Double) -> Double {
        let baseline = chart[finger]?["S"] ?? minMM
        return min(Double(setSizes.count - 1), max(0, mm - baseline))
    }

    /// Aggregate measured nails into one set size. Average per-finger size index,
    /// round (ties up). Returns nil until at least one nail is measured.
    static func sizeFromMeasurements(_ fingerMm: [String: Double]) -> String? {
        var indices: [Double] = []
        for finger in fingers {
            if let mm = fingerMm[finger] { indices.append(sizeIndex(finger, mm)) }
        }
        guard !indices.isEmpty else { return nil }
        let avg = indices.reduce(0, +) / Double(indices.count)
        let idx = min(setSizes.count - 1, max(0, Int(avg.rounded())))
        return setSizes[idx]
    }

    static let fingerLabels: [String: String] = [
        "thumb": "Thumb", "index": "Index", "middle": "Middle", "ring": "Ring", "pinky": "Pinky",
    ]
}
