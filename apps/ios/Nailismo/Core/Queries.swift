import Foundation

// Storefront GraphQL query strings, ported from packages/shopify/src/queries.ts.
enum Queries {
    static let products = """
    query Products($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
          handle
          productType
          tags
          featuredImage { url altText }
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 1) { nodes { id availableForSale } }
        }
      }
    }
    """

    static let collections = """
    query Collections($first: Int!) {
      collections(first: $first) {
        nodes {
          id
          handle
          title
          description
          image { url altText }
          products(first: 1) { nodes { featuredImage { url altText } } }
        }
      }
    }
    """

    static let productByHandle = """
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        descriptionHtml
        productType
        isGiftCard
        tags
        featuredImage { url altText }
        images(first: 8) { nodes { url altText } }
        options { id name values }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 50) {
          nodes {
            id
            title
            availableForSale
            selectedOptions { name value }
            price { amount currencyCode }
          }
        }
      }
    }
    """

    // "You may also like" — Shopify's own product recommendations for the PDP.
    // Mirrors PRODUCT_RECOMMENDATIONS_QUERY in packages/shopify; the card fields
    // match the lighter `products` query so RelatedProducts can reuse ProductCard.
    static let productRecommendations = """
    query ProductRecommendations($productId: ID!) {
      productRecommendations(productId: $productId) {
        id
        title
        handle
        productType
        tags
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 1) { nodes { id availableForSale } }
      }
    }
    """
}
