import Foundation

// Cart GraphQL, ported from packages/shopify/src/queries.ts.
enum CartQueries {
    static let fragment = """
    fragment CartFields on Cart {
      id
      checkoutUrl
      totalQuantity
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
      lines(first: 50) {
        nodes {
          id
          quantity
          cost { totalAmount { amount currencyCode } }
          merchandise {
            ... on ProductVariant {
              id
              title
              image { url altText }
              product { handle title }
              price { amount currencyCode }
              selectedOptions { name value }
            }
          }
        }
      }
    }
    """

    static let query = """
    query Cart($id: ID!) {
      cart(id: $id) { ...CartFields }
    }
    \(fragment)
    """

    static let create = """
    mutation CartCreate($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    \(fragment)
    """

    static let linesAdd = """
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    \(fragment)
    """

    static let linesUpdate = """
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    \(fragment)
    """

    static let linesRemove = """
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
    \(fragment)
    """
}
