import { describe, it, expect } from "vitest";
import { tickerItems } from "./ticker";
import type { PromoState } from "./holiday";

const STATIC = [
  "100% HAND-PAINTED",
  "FREE SHIPPING OVER $35",
  "READY IN MINUTES",
  "EASY CLEAN REMOVAL",
  "PRESS ON. SHOW OFF.",
];

const state = (s: Partial<PromoState>): PromoState => ({
  offerLive: false,
  seasonLive: false,
  blackFriday: false,
  cutoff: null,
  ...s,
});

describe("tickerItems", () => {
  it("leads with the offer and the standard cutoff, then the static items", () => {
    expect(tickerItems(state({ offerLive: true, seasonLive: true, cutoff: "standard" }))).toEqual([
      "ANY 3 SETS FOR $45",
      "US: ORDER BY MON DEC 14 FOR CHRISTMAS DELIVERY",
      ...STATIC,
    ]);
  });

  it("labels the offer Black Friday inside the BF window", () => {
    const items = tickerItems(state({ offerLive: true, seasonLive: true, blackFriday: true, cutoff: "standard" }));
    expect(items[0]).toBe("BLACK FRIDAY: ANY 3 SETS FOR $45");
  });

  it("drops the offer after it ends but keeps the cutoff line", () => {
    expect(tickerItems(state({ seasonLive: true, cutoff: "giftcard" }))).toEqual([
      "RUNNING LATE? GIFT CARDS DELIVER INSTANTLY",
      ...STATIC,
    ]);
  });

  it("is exactly the static list once the season is over", () => {
    expect(tickerItems(state({}))).toEqual(STATIC);
  });
});
