import type { ShopifyMoney } from "@nailismo/shopify";

/** Catalog is USD; keep it dependency-free (no Intl reliance under Hermes). */
export function formatMoney(money: ShopifyMoney): string {
  const n = Number(money.amount);
  const prefix = money.currencyCode === "USD" ? "$" : `${money.currencyCode} `;
  return `${prefix}${n.toFixed(2)}`;
}
