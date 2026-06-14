import Foundation
import Observation

// Shopify customer auth via the classic Storefront customerAccessToken flow.
// Token lives in the Keychain; the customer (with recent orders) is loaded on
// restore and after sign-in.
@MainActor
@Observable
final class AuthStore {
    var customer: Customer?
    var loading = false
    var errorMessage: String?

    private let tokenKey = "nailismo_customer_token"
    var isSignedIn: Bool { customer != nil }

    init() { Task { await restore() } }

    func restore() async {
        guard let token = Keychain.read(tokenKey) else { return }
        await loadCustomer(token)
    }

    @discardableResult
    func signIn(email: String, password: String) async -> Bool {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let data = try await StorefrontClient.shared.fetch(
                AuthQueries.tokenCreate,
                variables: ["input": ["email": email, "password": password]],
                as: TokenCreateData.self
            )
            let payload = data.customerAccessTokenCreate
            if let err = payload.customerUserErrors.first {
                errorMessage = err.message
                return false
            }
            guard let token = payload.customerAccessToken?.accessToken else {
                errorMessage = "Couldn't sign in. Check your email and password."
                return false
            }
            Keychain.save(token, key: tokenKey)
            await loadCustomer(token)
            return customer != nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            return false
        }
    }

    @discardableResult
    func register(firstName: String, email: String, password: String) async -> Bool {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            var input: [String: Any] = ["email": email, "password": password]
            if !firstName.isEmpty { input["firstName"] = firstName }
            let data = try await StorefrontClient.shared.fetch(
                AuthQueries.customerCreate,
                variables: ["input": input],
                as: CustomerCreateData.self
            )
            if let err = data.customerCreate.customerUserErrors.first {
                errorMessage = err.message
                return false
            }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            return false
        }
        // Created — sign in to mint a token.
        return await signIn(email: email, password: password)
    }

    func signOut() async {
        if let token = Keychain.read(tokenKey) {
            _ = try? await StorefrontClient.shared.fetch(
                AuthQueries.tokenDelete, variables: ["token": token], as: TokenDeleteData.self
            )
        }
        Keychain.delete(tokenKey)
        customer = nil
        errorMessage = nil
    }

    private func loadCustomer(_ token: String) async {
        do {
            let data = try await StorefrontClient.shared.fetch(
                AuthQueries.customer, variables: ["token": token], as: CustomerData.self
            )
            if let c = data.customer {
                customer = c
            } else {
                // Token invalid/expired.
                Keychain.delete(tokenKey)
                customer = nil
            }
        } catch {
            // Keep the token for a transient failure; surface nothing on restore.
        }
    }
}
