import SwiftUI
import UIKit

// Brand type: Fredoka (display) + Nunito (body), bundled in Resources/Fonts and
// registered via UIAppFonts. If a custom font fails to load, fall back to the
// system rounded face so the app always renders — Fredoka is a rounded candy
// face and SF Rounded is a close stand-in.
enum BrandFont {
    static let displayName = "Fredoka"
    static let bodyName = "Nunito"

    static let hasDisplay = UIFont(name: displayName, size: 12) != nil
    static let hasBody = UIFont(name: bodyName, size: 12) != nil
}

extension Font {
    /// Display / headline face (Fredoka, or rounded fallback).
    static func display(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        BrandFont.hasDisplay
            ? .custom(BrandFont.displayName, size: size).weight(weight)
            : .system(size: size, weight: weight, design: .rounded)
    }

    /// Body face (Nunito, or system fallback). Named `bodyFont` to avoid
    /// clashing with SwiftUI's built-in `Font.body`.
    static func bodyFont(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        BrandFont.hasBody
            ? .custom(BrandFont.bodyName, size: size).weight(weight)
            : .system(size: size, weight: weight)
    }
}

// Uppercase, letter-spaced "eyebrow" caption used across the brand.
struct Eyebrow: View {
    let text: String
    var color: Color = Candy.muted
    var body: some View {
        Text(text.uppercased())
            .font(.bodyFont(11, .bold))
            .tracking(2)
            .foregroundStyle(color)
    }
    init(_ text: String, color: Color = Candy.muted) {
        self.text = text
        self.color = color
    }
}
