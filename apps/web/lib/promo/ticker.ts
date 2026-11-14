import { OFFER_LABEL, cutoffMessage, type PromoState } from "./holiday";

// Evergreen announcement-ticker items (the pre-holiday list).
export const STATIC_TICKER_ITEMS = [
  "100% HAND-PAINTED",
  "FREE SHIPPING OVER $35",
  "READY IN MINUTES",
  "EASY CLEAN REMOVAL",
  "PRESS ON. SHOW OFF.",
] as const;

/** Seasonal items first (offer, then cutoff), then the evergreen list. */
export function tickerItems(state: PromoState): string[] {
  const seasonal: string[] = [];
  if (state.offerLive) {
    seasonal.push(`${state.blackFriday ? "Black Friday: " : ""}${OFFER_LABEL}`.toUpperCase());
  }
  const cutoff = cutoffMessage(state.cutoff);
  if (cutoff) seasonal.push(cutoff.toUpperCase());
  return [...seasonal, ...STATIC_TICKER_ITEMS];
}
