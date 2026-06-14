import SwiftUI

// Rounded search field + optional filter button. `editable` flips it between a
// tap-to-open pill (Home) and a live input (Shop).
struct SearchBar: View {
    var placeholder: String = "Search sets…"
    @Binding var text: String
    var editable: Bool = false
    var onTap: () -> Void = {}
    var onFilter: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Candy.muted)
                if editable {
                    TextField(placeholder, text: $text)
                        .font(.bodyFont(15))
                        .foregroundStyle(Candy.ink)
                        .tint(Candy.accent)
                } else {
                    Text(text.isEmpty ? placeholder : text)
                        .font(.bodyFont(15))
                        .foregroundStyle(text.isEmpty ? Candy.subtle : Candy.ink)
                    Spacer(minLength: 0)
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 48)
            .background(Candy.surface, in: Capsule())
            .softShadow()
            .contentShape(Capsule())
            .onTapGesture { if !editable { onTap() } }

            if let onFilter {
                Button(action: onFilter) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Candy.pop)
                        .frame(width: 48, height: 48)
                        .background(Candy.ink, in: RoundedRectangle(cornerRadius: Radius.md))
                }
                .buttonStyle(.plain)
            }
        }
    }
}
