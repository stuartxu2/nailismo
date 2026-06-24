"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { storefrontFetch, ShopifyConfigError } from "./client";
import {
  CART_QUERY,
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
} from "./queries";
import type {
  CartQueryResult,
  CartCreateResult,
  CartLinesAddResult,
  CartLinesRemoveResult,
  CartLinesUpdateResult,
  ShopifyCart,
} from "./types";

const CART_COOKIE = "nailismo_cart_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

async function setCartCookie(id: string) {
  const jar = await cookies();
  jar.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

async function clearCartCookie() {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}

export async function clearCart(): Promise<void> {
  await clearCartCookie();
  revalidatePath("/cart");
}

export async function getCart(): Promise<ShopifyCart | null> {
  const jar = await cookies();
  const id = jar.get(CART_COOKIE)?.value;
  if (!id) return null;
  try {
    const data = await storefrontFetch<CartQueryResult>(
      CART_QUERY,
      { id },
      { revalidate: 0 },
    );
    return data.cart;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] cart fetch failed:", err);
    }
    return null;
  }
}

type CartLine = { merchandiseId: string; quantity: number };

// Shared add path: append lines to the existing cart, or create one. Used by both
// the single-item quick-add (addToCart) and the multi-item compare add
// (addVariantsToCart). Caller handles revalidate/redirect/navigation.
async function addLines(lines: CartLine[]): Promise<void> {
  const jar = await cookies();
  const existingId = jar.get(CART_COOKIE)?.value;

  if (existingId) {
    const data = await storefrontFetch<CartLinesAddResult>(
      CART_LINES_ADD_MUTATION,
      { cartId: existingId, lines },
      { revalidate: 0 },
    );
    if (data.cartLinesAdd.userErrors.length > 0) {
      console.error("[shopify] cartLinesAdd errors:", data.cartLinesAdd.userErrors);
    }
    if (!data.cartLinesAdd.cart) {
      await clearCartCookie();
      await createAndSet(lines);
    }
  } else {
    await createAndSet(lines);
  }
}

async function createAndSet(lines: CartLine[]) {
  const data = await storefrontFetch<CartCreateResult>(
    CART_CREATE_MUTATION,
    { lines },
    { revalidate: 0 },
  );
  if (data.cartCreate.cart) {
    await setCartCookie(data.cartCreate.cart.id);
  }
}

export async function addToCart(formData: FormData): Promise<void> {
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!variantId) return;

  try {
    await addLines([{ merchandiseId: variantId, quantity }]);
  } catch (err) {
    console.error("[shopify] addToCart failed:", err);
    return;
  }
  revalidatePath("/cart");
  redirect("/cart");
}

// Bulk add for the Compare board. Called directly from the client (not via a
// form), so it returns a result instead of redirecting — the client clears the
// purchased items from Favorites on success, then navigates to /cart itself.
export async function addVariantsToCart(
  variantIds: string[],
): Promise<{ ok: boolean }> {
  const ids = variantIds.filter(Boolean);
  if (ids.length === 0) return { ok: false };

  try {
    await addLines(ids.map((merchandiseId) => ({ merchandiseId, quantity: 1 })));
  } catch (err) {
    console.error("[shopify] addVariantsToCart failed:", err);
    return { ok: false };
  }
  revalidatePath("/cart");
  return { ok: true };
}

export async function removeLine(formData: FormData): Promise<void> {
  const lineId = String(formData.get("lineId") ?? "");
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!lineId || !cartId) return;
  try {
    await storefrontFetch<CartLinesRemoveResult>(
      CART_LINES_REMOVE_MUTATION,
      { cartId, lineIds: [lineId] },
      { revalidate: 0 },
    );
  } catch (err) {
    console.error("[shopify] removeLine failed:", err);
  }
  revalidatePath("/cart");
}

export async function updateLineQuantity(formData: FormData): Promise<void> {
  const lineId = String(formData.get("lineId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!lineId || !cartId) return;
  if (quantity <= 0) {
    return removeLine(formData);
  }
  try {
    await storefrontFetch<CartLinesUpdateResult>(
      CART_LINES_UPDATE_MUTATION,
      { cartId, lines: [{ id: lineId, quantity }] },
      { revalidate: 0 },
    );
  } catch (err) {
    console.error("[shopify] updateLineQuantity failed:", err);
  }
  revalidatePath("/cart");
}
