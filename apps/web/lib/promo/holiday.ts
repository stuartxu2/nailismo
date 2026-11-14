// Holiday 2026 promo config: "Any 3 sets for $45" (Every Possible Discount,
// automatic, targets the hidden `nail-sets` collection) plus US Christmas
// shipping cutoffs. Single source of truth for every surface that shows the
// offer or a cutoff. All windows are half-open [start, end).
// Spec: docs/superpowers/specs/2026-11-14-holiday-package-design.md

export const BUNDLE_TAG = "Nail Set";
export const BUNDLE_SIZE = 3;
export const BUNDLE_PRICE = 45;
export const OFFER_LABEL = "Any 3 sets for $45";

/** Master switch for every 3-for-$45 surface (PDP chip + nudge, ticker, band,
 *  cart savings/nudge/suggestions). Stays false until the EPD rule is live and
 *  tools/verify_bundle_discount.py passes; season + cutoff copy ship regardless. */
export const OFFER_ENABLED = false;

/** Offer ends Dec 15 23:59 PT (exclusive end = Dec 16 00:00 PT). */
export const OFFER_END = new Date("2026-12-16T08:00:00Z");
/** Standard shipping Christmas cutoff: Mon Dec 14, 2pm ET. */
export const STANDARD_CUTOFF = new Date("2026-12-14T19:00:00Z");
/** Express shipping Christmas cutoff: Mon Dec 21, 2pm ET. */
export const EXPRESS_CUTOFF = new Date("2026-12-21T19:00:00Z");
/** All seasonal copy and links revert at Dec 26 00:00 PT. */
export const SEASON_END = new Date("2026-12-26T08:00:00Z");
/** Black Friday – Cyber Monday label window (Nov 27 00:00 PT → Dec 1 00:00 PT). */
export const BF_START = new Date("2026-11-27T08:00:00Z");
export const BF_END = new Date("2026-12-01T08:00:00Z");

export type PromoState = {
  offerLive: boolean;
  seasonLive: boolean;
  blackFriday: boolean;
  cutoff: "standard" | "express" | "giftcard" | null;
};

export function getPromoState(now: Date, offerEnabled: boolean = OFFER_ENABLED): PromoState {
  const t = now.getTime();
  const offerLive = offerEnabled && t < OFFER_END.getTime();
  const cutoff: PromoState["cutoff"] =
    t < STANDARD_CUTOFF.getTime()
      ? "standard"
      : t < EXPRESS_CUTOFF.getTime()
        ? "express"
        : t < SEASON_END.getTime()
          ? "giftcard"
          : null;
  return {
    offerLive,
    seasonLive: t < SEASON_END.getTime(),
    blackFriday: offerLive && t >= BF_START.getTime() && t < BF_END.getTime(),
    cutoff,
  };
}

const CUTOFF_COPY: Record<NonNullable<PromoState["cutoff"]>, string> = {
  standard: "US: order by Mon Dec 14 for Christmas delivery",
  express: "US: order with Express by Mon Dec 21 for Christmas delivery",
  giftcard: "Running late? Gift cards deliver instantly",
};

export function cutoffMessage(c: PromoState["cutoff"]): string | null {
  return c ? CUTOFF_COPY[c] : null;
}

export type GiftNav = { href: string; label: string };

/** Header / mobile-menu gift link: the gift guide during the season, the gift card otherwise. */
export function giftNav(state: PromoState): GiftNav {
  return state.seasonLive
    ? { href: "/collections/holiday-gift-guide", label: "Gift Guide" }
    : { href: "/products/nailismo-gift-card", label: "Gift Card" };
}

export function isBundleEligible(tags: readonly string[]): boolean {
  return tags.includes(BUNDLE_TAG);
}
