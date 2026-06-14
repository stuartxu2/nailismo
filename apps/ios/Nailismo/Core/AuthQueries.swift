import Foundation

// Classic Storefront customer auth (customerAccessToken flow). Some shops use the
// newer OAuth-based Customer Accounts instead; if these fields are disabled the
// server returns an error, which AuthStore surfaces to the user.
enum AuthQueries {
    static let tokenCreate = """
    mutation TokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { code field message }
      }
    }
    """

    static let customerCreate = """
    mutation CustomerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer { id email }
        customerUserErrors { code field message }
      }
    }
    """

    static let tokenDelete = """
    mutation TokenDelete($token: String!) {
      customerAccessTokenDelete(customerAccessToken: $token) {
        deletedAccessToken
        userErrors { field message }
      }
    }
    """

    static let customer = """
    query Customer($token: String!) {
      customer(customerAccessToken: $token) {
        id
        firstName
        lastName
        displayName
        email
        orders(first: 25, sortKey: PROCESSED_AT, reverse: true) {
          nodes {
            id
            name
            processedAt
            financialStatus
            fulfillmentStatus
            currentTotalPrice { amount currencyCode }
          }
        }
      }
    }
    """
}
