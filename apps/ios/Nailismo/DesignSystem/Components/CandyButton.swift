import SwiftUI

enum CandyButtonVariant { case pop, ink, ghost }

// Pill button in the brand's three flavors: lime (pop), plum (ink), outline (ghost).
struct CandyButton: View {
    let title: String
    var variant: CandyButtonVariant = .pop
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.bodyFont(15, .bold))
                .tracking(0.3)
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(background, in: Capsule())
                .overlay(Capsule().stroke(borderColor, lineWidth: 1.5))
                .popShadowIfPop(variant)
        }
        .buttonStyle(PressableStyle())
    }

    private var background: Color {
        switch variant {
        case .pop: return Candy.pop
        case .ink: return Candy.ink
        case .ghost: return .clear
        }
    }
    private var foreground: Color {
        switch variant {
        case .pop: return Candy.onPop
        case .ink: return Candy.onAccent
        case .ghost: return Candy.ink
        }
    }
    private var borderColor: Color { variant == .ghost ? Candy.ink : background }
}

private extension View {
    @ViewBuilder
    func popShadowIfPop(_ variant: CandyButtonVariant) -> some View {
        if variant == .pop { popShadow() } else { self }
    }
}

// Shared press feedback: gentle scale + opacity, transform/opacity only.
struct PressableStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.92 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
