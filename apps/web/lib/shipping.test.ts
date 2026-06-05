import { describe, it, expect } from "vitest";
import { FREE_SHIPPING_THRESHOLD, freeShippingRemaining } from "./shipping";

describe("freeShippingRemaining", () => {
  it("returns the gap when below the threshold", () => {
    expect(freeShippingRemaining(17.99)).toBeCloseTo(FREE_SHIPPING_THRESHOLD - 17.99);
  });

  it("returns 0 exactly at the threshold", () => {
    expect(freeShippingRemaining(FREE_SHIPPING_THRESHOLD)).toBe(0);
  });

  it("never goes negative once the threshold is passed", () => {
    expect(freeShippingRemaining(50)).toBe(0);
  });
});
