// Cart state for mobile. Mirrors the web cart's Storefront mutations but holds
// the cart id in AsyncStorage (no Next cookies) and exposes a zustand store.
// Checkout opens cart.checkoutUrl in expo-web-browser (Shopify-hosted).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  storefrontFetch,
  CART_QUERY,
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  type ShopifyCart,
  type CartQueryResult,
  type CartCreateResult,
  type CartLinesAddResult,
  type CartLinesRemoveResult,
  type CartLinesUpdateResult,
} from "../lib/shopify";

const CART_ID_KEY = "nailismo_cart_id";

type CartState = {
  cart: ShopifyCart | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  addLine: (merchandiseId: string, quantity?: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
};

async function setCartId(id: string) {
  await AsyncStorage.setItem(CART_ID_KEY, id);
}
async function getCartId(): Promise<string | null> {
  return AsyncStorage.getItem(CART_ID_KEY);
}
async function clearCartId() {
  await AsyncStorage.removeItem(CART_ID_KEY);
}

export const useCart = create<CartState>((set, get) => ({
  cart: null,
  loading: false,

  hydrate: async () => {
    const id = await getCartId();
    if (!id) return;
    set({ loading: true });
    try {
      const data = await storefrontFetch<CartQueryResult>(CART_QUERY, { id }, { revalidate: 0 });
      if (data.cart) set({ cart: data.cart });
      else await clearCartId();
    } catch (err) {
      console.warn("[cart] hydrate failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  addLine: async (merchandiseId, quantity = 1) => {
    set({ loading: true });
    try {
      const id = await getCartId();
      if (id) {
        const data = await storefrontFetch<CartLinesAddResult>(
          CART_LINES_ADD_MUTATION,
          { cartId: id, lines: [{ merchandiseId, quantity }] },
          { revalidate: 0 },
        );
        if (data.cartLinesAdd.cart) {
          set({ cart: data.cartLinesAdd.cart });
          return;
        }
        // Stale cart id — fall through to create a fresh one.
        await clearCartId();
      }
      const data = await storefrontFetch<CartCreateResult>(
        CART_CREATE_MUTATION,
        { lines: [{ merchandiseId, quantity }] },
        { revalidate: 0 },
      );
      if (data.cartCreate.cart) {
        await setCartId(data.cartCreate.cart.id);
        set({ cart: data.cartCreate.cart });
      }
    } catch (err) {
      console.warn("[cart] addLine failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  removeLine: async (lineId) => {
    const id = await getCartId();
    if (!id) return;
    set({ loading: true });
    try {
      const data = await storefrontFetch<CartLinesRemoveResult>(
        CART_LINES_REMOVE_MUTATION,
        { cartId: id, lineIds: [lineId] },
        { revalidate: 0 },
      );
      if (data.cartLinesRemove.cart) set({ cart: data.cartLinesRemove.cart });
    } catch (err) {
      console.warn("[cart] removeLine failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  updateLine: async (lineId, quantity) => {
    if (quantity <= 0) return get().removeLine(lineId);
    const id = await getCartId();
    if (!id) return;
    set({ loading: true });
    try {
      const data = await storefrontFetch<CartLinesUpdateResult>(
        CART_LINES_UPDATE_MUTATION,
        { cartId: id, lines: [{ id: lineId, quantity }] },
        { revalidate: 0 },
      );
      if (data.cartLinesUpdate.cart) set({ cart: data.cartLinesUpdate.cart });
    } catch (err) {
      console.warn("[cart] updateLine failed:", err);
    } finally {
      set({ loading: false });
    }
  },
}));
