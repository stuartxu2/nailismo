import SwiftUI

// Sign in / create account form (classic Storefront customer auth).
struct AuthView: View {
    @Environment(AuthStore.self) private var auth
    @State private var mode = "Sign in"
    @State private var firstName = ""
    @State private var email = ""
    @State private var password = ""

    private var isCreate: Bool { mode == "Create" }
    private var canSubmit: Bool { !auth.loading && !email.isEmpty && password.count >= 5 }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SegmentedToggle(options: ["Sign in", "Create"], selection: $mode)

            VStack(spacing: 10) {
                if isCreate {
                    field("First name", text: $firstName, secure: false, content: .givenName)
                }
                field("Email", text: $email, secure: false, content: .emailAddress)
                field("Password", text: $password, secure: true, content: isCreate ? .newPassword : .password)
            }

            if let err = auth.errorMessage {
                Text(err)
                    .font(.bodyFont(13, .semibold))
                    .foregroundStyle(Candy.accent)
            }

            CandyButton(
                title: auth.loading ? "Please wait…" : (isCreate ? "Create account" : "Sign in"),
                variant: .pop
            ) {
                Task {
                    if isCreate {
                        await auth.register(firstName: firstName, email: email, password: password)
                    } else {
                        await auth.signIn(email: email, password: password)
                    }
                }
            }
            .disabled(!canSubmit)
            .opacity(canSubmit ? 1 : 0.6)
        }
        .padding(20)
        .background(Candy.surface, in: RoundedRectangle(cornerRadius: Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg).stroke(Candy.border, lineWidth: 1))
        .candyShadow()
    }

    private func field(
        _ placeholder: String,
        text: Binding<String>,
        secure: Bool,
        content: UITextContentType
    ) -> some View {
        Group {
            if secure {
                SecureField(placeholder, text: text)
            } else {
                TextField(placeholder, text: text)
            }
        }
        .font(.bodyFont(15))
        .foregroundStyle(Candy.ink)
        .tint(Candy.accent)
        .textContentType(content)
        .keyboardType(content == .emailAddress ? .emailAddress : .default)
        .textInputAutocapitalization(content == .givenName ? .words : .never)
        .autocorrectionDisabled()
        .padding(.horizontal, 14)
        .frame(height: 46)
        .background(Candy.bg, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Candy.border, lineWidth: 1))
    }
}
