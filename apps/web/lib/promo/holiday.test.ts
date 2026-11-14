import { describe, it, expect } from "vitest";
import { cutoffMessage, getPromoState, giftNav, isBundleEligible } from "./holiday";

// Window tests run with the offer switched on; the switch has its own test.
const at = (iso: string) => getPromoState(new Date(iso), true);

describe("getPromoState", () => {
  it("offer switch off: no offer, season and cutoffs unaffected", () => {
    expect(getPromoState(new Date("2026-11-20T12:00:00Z"), false)).toEqual({
      offerLive: false,
      seasonLive: true,
      blackFriday: false,
      cutoff: "standard",
    });
    expect(getPromoState(new Date("2026-11-28T12:00:00Z"), false).blackFriday).toBe(false);
  });

  it("mid-November: offer + season live, standard cutoff, not Black Friday", () => {
    expect(at("2026-11-20T12:00:00Z")).toEqual({
      offerLive: true,
      seasonLive: true,
      blackFriday: false,
      cutoff: "standard",
    });
  });

  it("Black Friday window is [Nov 27 00:00 PT, Dec 1 00:00 PT)", () => {
    expect(at("2026-11-27T07:59:59Z").blackFriday).toBe(false);
    expect(at("2026-11-27T08:00:00Z").blackFriday).toBe(true);
    expect(at("2026-12-01T08:00:00Z").blackFriday).toBe(false);
  });

  it("cutoffs flip at 2pm ET on Dec 14 and Dec 21", () => {
    expect(at("2026-12-14T18:59:59Z").cutoff).toBe("standard");
    expect(at("2026-12-14T19:00:00Z").cutoff).toBe("express");
    expect(at("2026-12-21T18:59:59Z").cutoff).toBe("express");
    expect(at("2026-12-21T19:00:00Z").cutoff).toBe("giftcard");
  });

  it("offer ends at Dec 16 00:00 PT while the season continues", () => {
    expect(at("2026-12-16T07:59:59Z").offerLive).toBe(true);
    const after = at("2026-12-16T08:00:00Z");
    expect(after.offerLive).toBe(false);
    expect(after.seasonLive).toBe(true);
  });

  it("everything is off from Dec 26 00:00 PT", () => {
    expect(at("2026-12-25T23:59:59Z").seasonLive).toBe(true);
    expect(at("2026-12-26T08:00:00Z")).toEqual({
      offerLive: false,
      seasonLive: false,
      blackFriday: false,
      cutoff: null,
    });
  });
});

describe("cutoffMessage", () => {
  it("returns the exact US cutoff copy", () => {
    expect(cutoffMessage("standard")).toBe("US: order by Mon Dec 14 for Christmas delivery");
    expect(cutoffMessage("express")).toBe("US: order with Express by Mon Dec 21 for Christmas delivery");
    expect(cutoffMessage("giftcard")).toBe("Running late? Gift cards deliver instantly");
    expect(cutoffMessage(null)).toBeNull();
  });
});

describe("giftNav", () => {
  it("points at the gift guide during the season and the gift card after", () => {
    expect(giftNav(at("2026-12-25T12:00:00Z"))).toEqual({
      href: "/collections/holiday-gift-guide",
      label: "Gift Guide",
    });
    expect(giftNav(at("2026-12-26T08:00:00Z"))).toEqual({
      href: "/products/nailismo-gift-card",
      label: "Gift Card",
    });
  });
});

describe("isBundleEligible", () => {
  it("is true only for products tagged Nail Set", () => {
    expect(isBundleEligible(["Nail Set", "Blue"])).toBe(true);
    expect(isBundleEligible(["Blue"])).toBe(false);
    expect(isBundleEligible([])).toBe(false);
  });
});
