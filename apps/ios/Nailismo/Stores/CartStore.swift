import Foundation
import Observation

// Real Shopify cart. Holds the cart id in UserDefaults; checkout opens
// cart.checkoutUrl (Shopify-hosted). Mirrors apps/app/src/store/cart.ts.
@MainActor
@Observable
final class CartStore {
    var cart: Cart?
    var loading = false
    private let idKey = "nailismo_cart_id"

    var count: Int { cart?.totalQuantity ?? 0 }
    var checkoutURL: URL? {
        guard let urlString = cart?.checkoutUrl else { return nil }
        return URL(string: urlString)
    }

    init() { Task { await hydrate() } }

    private var cartId: String? {
        get { UserDefaults.standard.string(forKey: idKey) }
        set {
            if let newValue { UserDefaults.standard.set(newValue, forKey: idKey) }
            else { UserDefaults.standard.removeObject(forKey: idKey) }
        }
    }

    func hydrate() async {
        guard let id = cartId else { return }
        loading = true
        defer { loading = false }
        do {
            let data = try await StorefrontClient.shared.fetch(
                CartQueries.query, variables: ["id": id], as: CartData.self
            )
            if let c = data.cart { cart = c } else { cartId = nil }
        } catch {
            // best-effort; keep id and let next action retry
        }
    }

    func addLine(_ merchandiseId: String, quantity: Int = 1) async {
        loading = true
        defer { loading = false }
        let line: [String: Any] = ["merchandiseId": merchandiseId, "quantity": quantity]
        do {
            if let id = cartId {
                let data = try await StorefrontClient.shared.fetch(
                    CartQueries.linesAdd,
                    variables: ["cartId": id, "lines": [line]],
                    as: CartLinesAddData.self
                )
                if let c = data.cartLinesAdd.cart { cart = c; return }
                cartId = nil // stale id — fall through to create
            }
            let data = try await StorefrontClient.shared.fetch(
                CartQueries.create, variables: ["lines": [line]], as: CartCreateData.self
            )
            if let c = data.cartCreate.cart {
                cartId = c.id
                cart = c
            }
        } catch {
            // swallow — UI stays responsive; user can retry
        }
    }

    func updateLine(_ lineId: String, quantity: Int) async {
        if quantity <= 0 { return await removeLine(lineId) }
        guard let id = cartId else { return }
        loading = true
        defer { loading = false }
        do {
            let data = try await StorefrontClient.shared.fetch(
                CartQueries.linesUpdate,
                variables: ["cartId": id, "lines": [["id": lineId, "quantity": quantity]]],
                as: CartLinesUpdateData.self
            )
            if let c = data.cartLinesUpdate.cart { cart = c }
        } catch {}
    }

    func removeLine(_ lineId: String) async {
        guard let id = cartId else { return }
        loading = true
        defer { loading = false }
        do {
            let data = try await StorefrontClient.shared.fetch(
                CartQueries.linesRemove,
                variables: ["cartId": id, "lineIds": [lineId]],
                as: CartLinesRemoveData.self
            )
            if let c = data.cartLinesRemove.cart { cart = c }
        } catch {}
    }
}
