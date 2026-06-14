import SwiftUI

// Map Shopify color tags to swatch hexes (mirrors apps/app/src/lib/tag-colors.ts
// and the web shop tiles). Non-color tags are ignored.
enum ProductColors {
    static let map: [String: String] = [
        "Black": "271028",
        "White": "FFFFFF",
        "Silver": "C9CCD6",
        "Nude": "E8C9B0",
        "Blue": "7AB8FF",
        "Green": "7BD389",
        "Red": "FF6B6B",
        "Gold": "E8C24A",
        "Pink": "FF7AC6",
        "Purple": "B98CFF",
    ]

    static func dots(_ tags: [String]) -> [Color] {
        tags.compactMap { map[$0].map(Color.init(hex:)) }
    }
}

// Rotating candy tile tints behind product images.
enum TileTints {
    static let all = ["F7E6FF", "E6F7FF", "FFF6D6", "E6FBEF", "FFE9F5"].map(Color.init(hex:))
    static func at(_ index: Int) -> Color { all[((index % all.count) + all.count) % all.count] }
}
