// Build a Storefront cart for the chosen custom design and return its hosted
// checkout URL. The chosen design + session refs ride as line attributes (so
// fulfillment knows what to make); the $2-off code is pre-applied so the $69
// product nets to $67 at checkout.

import { storefrontFetch } from "../shopify/client";

const CUSTOM_CART_CREATE = /* GraphQL */ `
  mutation CustomCart($lines: [CartLineInput!], $discountCodes: [String!]) {
    cartCreate(input: { lines: $lines, discountCodes: $discountCodes }) {
      cart { checkoutUrl }
      userErrors { field message }
    }
  }
`;

export type CartAttribute = { key: string; value: string };

type CartCreateResult = {
  cartCreate: { cart: { checkoutUrl: string } | null; userErrors: Array<{ message: string }> };
};

export async function createCustomCheckout(args: {
  variantId: string;
  attributes: CartAttribute[];
  discountCode?: string;
}): Promise<string> {
  const data = await storefrontFetch<CartCreateResult>(
    CUSTOM_CART_CREATE,
    {
      lines: [{ merchandiseId: args.variantId, quantity: 1, attributes: args.attributes }],
      discountCodes: args.discountCode ? [args.discountCode] : [],
    },
    { revalidate: 0 },
  );
  const errs = data.cartCreate.userErrors;
  if (errs.length) throw new Error(`cartCreate: ${errs.map((e) => e.message).join("; ")}`);
  const url = data.cartCreate.cart?.checkoutUrl;
  if (!url) throw new Error("cartCreate returned no checkoutUrl");
  return url;
}
