import Foundation

// Press-on nail sizing — ported verbatim from packages/fit-sizing/src/index.ts.
// Calibrate once against a bank/ID card (85.6mm), derive px->mm, match each nail
// against the printed S/M/L/XL chart, aggregate into one set size.
enum FitSizing {
    static let fingers = ["thumb", "index", "middle", "ring", "pinky"]
    static let setSizes = ["S", "M", "L", "XL"]

    /// The four nails the top-down camera can actually measure (thumb excluded —
    /// it lies edge-on in a flat photo and is derived from a sibling instead).
    static let measuredFingers = ["index", "middle", "ring", "pinky"]

    /// Exact, constant chart offsets used to estimate the thumb.
    static let thumbOffsetFromMiddleMM: Double = 3
    static let thumbOffsetFromIndexMM: Double = 4

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

    /// Estimate the thumb's width (mm) from a measured sibling finger. Prefers
    /// the middle (+3mm), falls back to the index (+4mm), nil if neither.
    /// Clamped. Display-only — must NOT be passed into sizeFromMeasurements.
    static func deriveThumbMm(_ fingerMm: [String: Double]) -> Double? {
        if let m = fingerMm["middle"] { return clampMm(m + thumbOffsetFromMiddleMM) }
        if let i = fingerMm["index"] { return clampMm(i + thumbOffsetFromIndexMM) }
        return nil
    }

    /// Continuous set-size position (0=S … 3=XL) for one finger at a width.
    private static func sizeIndex(_ finger: String, _ mm: Double) -> Double {
        let baseline = chart[finger]?["S"] ?? minMM
        return min(Double(setSizes.count - 1), max(0, mm - baseline))
    }

    /// Aggregate the four measured fingers (index, middle, ring, pinky) into one
    /// set size. Each finger votes a continuous size index; average and round (ties
    /// up). Returns nil until at least one measured finger has a value. Any thumb
    /// entry in the map is ignored — the thumb is derived for display only and
    /// never votes.
    static func sizeFromMeasurements(_ fingerMm: [String: Double]) -> String? {
        var indices: [Double] = []
        for finger in measuredFingers {
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
