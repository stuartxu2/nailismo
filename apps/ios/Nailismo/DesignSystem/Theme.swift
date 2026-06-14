import SwiftUI

// The "candy" brand palette — mirrors @nailismo/theme (packages/theme) and the
// live web tokens so iOS reads as the same brand. Source of truth for the hexes
// stays in brand_assets/ + globals.css; this is the typed Swift copy.
extension Color {
    init(hex: String) {
        let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r, g, b, a: Double
        switch s.count {
        case 8: // RRGGBBAA
            r = Double((v >> 24) & 0xFF) / 255
            g = Double((v >> 16) & 0xFF) / 255
            b = Double((v >> 8) & 0xFF) / 255
            a = Double(v & 0xFF) / 255
        default: // RRGGBB
            r = Double((v >> 16) & 0xFF) / 255
            g = Double((v >> 8) & 0xFF) / 255
            b = Double(v & 0xFF) / 255
            a = 1
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

enum Candy {
    static let bg = Color(hex: "E6D5EB")        // lilac page background
    static let surface = Color(hex: "FFFFFF")   // cards / sheets
    static let border = Color(hex: "C9B6D2")    // lilac dividers
    static let ink = Color(hex: "271028")       // plum primary text
    static let muted = Color(hex: "60779F")     // slate — header bands, labels
    static let subtle = Color(hex: "6E5E72")    // secondary text
    static let accent = Color(hex: "4F6796")    // deep-slate links
    static let pop = Color(hex: "9FED40")       // lime — primary CTA + Measure FAB
    static let onPop = Color(hex: "271028")     // text on lime
    static let onAccent = Color(hex: "E6D5EB")  // text on dark

    // Candy-tinted shadow colors — never a flat gray drop shadow.
    static let shadowCard = Color(hex: "B98CFF") // lilac glow
    static let shadowPop = Color(hex: "7BC400")  // lime glow
}

enum Radius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 14
    static let lg: CGFloat = 22
    static let pill: CGFloat = 999
}

extension View {
    /// Layered lilac card shadow.
    func candyShadow() -> some View {
        shadow(color: Candy.shadowCard.opacity(0.28), radius: 18, x: 0, y: 10)
    }
    /// Lime "pop" shadow for primary actions (Measure FAB, lime buttons).
    func popShadow() -> some View {
        shadow(color: Candy.shadowPop.opacity(0.45), radius: 14, x: 0, y: 8)
    }
    /// Subtle plum-tinted shadow for chips and small surfaces.
    func softShadow() -> some View {
        shadow(color: Candy.ink.opacity(0.10), radius: 10, x: 0, y: 4)
    }
}
