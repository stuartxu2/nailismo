export type ShopQueryResult = {
  shop: {
    name: string;
    primaryDomain: { url: string };
  };
};

export type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  productType: string;
  tags: string[];
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: ShopifyMoney;
  };
  variants?: {
    nodes: {
      id: string;
      availableForSale: boolean;
      selectedOptions?: { name: string; value: string }[];
    }[];
  };
};

export type ProductsQueryResult = {
  products: { nodes: ShopifyProduct[] };
};

export type SearchProductsQueryResult = ProductsQueryResult;

export type ShopifyPolicy = {
  handle: string;
  title: string;
  body: string;
  url: string;
};

export type ShopPoliciesQueryResult = {
  shop: {
    privacyPolicy: ShopifyPolicy | null;
    refundPolicy: ShopifyPolicy | null;
    shippingPolicy: ShopifyPolicy | null;
    termsOfService: ShopifyPolicy | null;
    subscriptionPolicy: ShopifyPolicy | null;
  };
};

export type ShopifyImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type ShopifyVideoSource = { url: string; mimeType: string; height?: number | null };

// Flattened product media node — fields present depend on mediaContentType
// (IMAGE → image, VIDEO → sources/previewImage, EXTERNAL_VIDEO → embedUrl).
export type ShopifyMediaNode = {
  mediaContentType: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO" | "MODEL_3D";
  alt: string | null;
  image?: ShopifyImage | null;
  sources?: ShopifyVideoSource[];
  previewImage?: { url: string; altText: string | null } | null;
  host?: string;
  embedUrl?: string;
};

export type ShopifyVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: ShopifyMoney;
};

export type ShopifyProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type ShopifyProductDetail = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  vendor: string;
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  images: { nodes: ShopifyImage[] };
  media?: { nodes: ShopifyMediaNode[] };
  options: ShopifyProductOption[];
  priceRange: {
    minVariantPrice: ShopifyMoney;
  };
  variants: { nodes: ShopifyVariant[] };
};

export type ProductByHandleQueryResult = {
  product: ShopifyProductDetail | null;
};

export type ProductHandlesQueryResult = {
  products: { nodes: { handle: string }[] };
};

export type ShopifyArticleSummary = {
  id: string;
  handle: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  image: { url: string; altText: string | null } | null;
  blog: { handle: string; title: string };
  authorV2: { name: string } | null;
};

export type ArticlesQueryResult = {
  articles: { nodes: ShopifyArticleSummary[] };
};

export type ArticleHandlesQueryResult = {
  articles: { nodes: { handle: string; blog: { handle: string } }[] };
};

export type ShopifyArticleDetail = {
  id: string;
  handle: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  publishedAt: string;
  tags: string[];
  image: { url: string; altText: string | null; width: number | null; height: number | null } | null;
  authorV2: { name: string; bio: string | null } | null;
  blog: { handle: string; title: string };
};

export type ArticleByHandleQueryResult = {
  blog: { articleByHandle: ShopifyArticleDetail | null } | null;
};

export type ShopifyCollectionSummary = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: { url: string; altText: string | null } | null;
};

export type CollectionHandlesQueryResult = {
  collections: { nodes: { handle: string }[] };
};

export type ShopifyCollectionCard = ShopifyCollectionSummary & {
  products: {
    nodes: { featuredImage: { url: string; altText: string | null } | null }[];
  };
};

export type CollectionsQueryResult = {
  collections: { nodes: ShopifyCollectionCard[] };
};

export type ShopifyCollectionDetail = ShopifyCollectionSummary & {
  descriptionHtml: string;
  products: { nodes: ShopifyProduct[] };
};

export type CollectionByHandleQueryResult = {
  collection: ShopifyCollectionDetail | null;
};

export type ShopifyCartLine = {
  id: string;
  quantity: number;
  cost: { totalAmount: ShopifyMoney };
  merchandise: {
    id: string;
    title: string;
    image: { url: string; altText: string | null } | null;
    product: { handle: string; title: string };
    price: ShopifyMoney;
    selectedOptions: { name: string; value: string }[];
  };
};

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: ShopifyMoney;
    totalAmount: ShopifyMoney;
  };
  lines: { nodes: ShopifyCartLine[] };
};

export type CartQueryResult = { cart: ShopifyCart | null };

export type CartMutationResult = {
  cart: ShopifyCart | null;
  userErrors: { field: string[] | null; message: string }[];
};

export type CartCreateResult = { cartCreate: CartMutationResult };
export type CartLinesAddResult = { cartLinesAdd: CartMutationResult };
export type CartLinesRemoveResult = { cartLinesRemove: CartMutationResult };
export type CartLinesUpdateResult = { cartLinesUpdate: CartMutationResult };

export type ProductsFeedNode = {
  handle: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  isGiftCard: boolean;
  availableForSale: boolean;
  featuredImage: { url: string } | null;
  images: { nodes: { url: string }[] };
  priceRange: { minVariantPrice: ShopifyMoney };
};

export type ProductsFeedQueryResult = {
  products: { nodes: ProductsFeedNode[] };
};
