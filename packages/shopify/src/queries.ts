export const SHOP_QUERY = /* GraphQL */ `
  query Shop {
    shop {
      name
      primaryDomain {
        url
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      descriptionHtml
      productType
      tags
      vendor
      availableForSale
      featuredImage {
        url
        altText
      }
      images(first: 8) {
        nodes {
          url
          altText
          width
          height
        }
      }
      media(first: 12) {
        nodes {
          mediaContentType
          alt
          ... on MediaImage {
            image { url altText width height }
          }
          ... on Video {
            sources { url mimeType height }
            previewImage { url altText }
          }
          ... on ExternalVideo {
            host
            embedUrl
            previewImage { url altText }
          }
        }
      }
      options {
        id
        name
        values
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 50) {
        nodes {
          id
          title
          availableForSale
          selectedOptions {
            name
            value
          }
          price {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export const PRODUCT_HANDLES_QUERY = /* GraphQL */ `
  query ProductHandles($first: Int!) {
    products(first: $first) {
      nodes {
        handle
      }
    }
  }
`;

export const COLLECTION_HANDLES_QUERY = /* GraphQL */ `
  query CollectionHandles($first: Int!) {
    collections(first: $first) {
      nodes { handle }
    }
  }
`;

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query Collections($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        handle
        title
        description
        image { url altText }
        products(first: 1) {
          nodes {
            featuredImage { url altText }
          }
        }
      }
    }
  }
`;

export const COLLECTION_BY_HANDLE_QUERY = /* GraphQL */ `
  query CollectionByHandle($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      image { url altText }
      products(first: $first) {
        nodes {
          id
          title
          handle
          productType
          tags
          featuredImage { url altText }
          priceRange {
            minVariantPrice { amount currencyCode }
          }
        }
      }
    }
  }
`;

export const CART_FRAGMENT = /* GraphQL */ `
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
`;

export const CART_QUERY = /* GraphQL */ `
  query Cart($id: ID!) {
    cart(id: $id) { ...CartFields }
  }
  ${CART_FRAGMENT}
`;

export const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

export const CUSTOMER_CREATE_MUTATION = /* GraphQL */ `
  mutation CustomerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer { id email }
      customerUserErrors { field message code }
    }
  }
`;

export const ARTICLES_QUERY = /* GraphQL */ `
  query Articles($first: Int!) {
    articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
      nodes {
        id
        handle
        title
        excerpt
        publishedAt
        image { url altText }
        blog { handle title }
        authorV2 { name }
      }
    }
  }
`;

export const ARTICLE_HANDLES_QUERY = /* GraphQL */ `
  query ArticleHandles($first: Int!) {
    articles(first: $first) {
      nodes { handle blog { handle } }
    }
  }
`;

export const ARTICLE_BY_HANDLE_QUERY = /* GraphQL */ `
  query ArticleByHandle($blog: String!, $handle: String!) {
    blog(handle: $blog) {
      articleByHandle(handle: $handle) {
        id
        handle
        title
        excerpt
        contentHtml
        publishedAt
        tags
        image { url altText width height }
        authorV2 { name bio }
        blog { handle title }
      }
    }
  }
`;

export const SEARCH_PRODUCTS_QUERY = /* GraphQL */ `
  query SearchProducts($query: String!, $first: Int!) {
    products(query: $query, first: $first) {
      nodes {
        id
        title
        handle
        productType
        tags
        featuredImage { url altText }
        priceRange {
          minVariantPrice { amount currencyCode }
        }
      }
    }
  }
`;

export const SHOP_POLICIES_QUERY = /* GraphQL */ `
  query ShopPolicies {
    shop {
      privacyPolicy { handle title body url }
      refundPolicy { handle title body url }
      shippingPolicy { handle title body url }
      termsOfService { handle title body url }
      subscriptionPolicy { handle title body url }
    }
  }
`;

export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!) {
    products(first: $first) {
      nodes {
        id
        title
        handle
        productType
        tags
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 1) {
          nodes {
            id
            availableForSale
          }
        }
      }
    }
  }
`;

export const PRODUCTS_FEED_QUERY = /* GraphQL */ `
  query ProductsFeed($first: Int!) {
    products(first: $first) {
      nodes {
        handle
        title
        descriptionHtml
        vendor
        isGiftCard
        availableForSale
        featuredImage { url }
        images(first: 10) { nodes { url } }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
`;
