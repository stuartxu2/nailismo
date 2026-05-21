import { describe, it, expect } from "vitest";
import {
  pxPerMm,
  pxToMm,
  mmToSize,
  clampMm,
  buildSymmetricMap,
  isComplete,
  recommendSet,
  firstVariantId,
  CARD_WIDTH_MM,
  FINGERS,
  MIN_MM,
  MAX_MM,
} from "./sizing";

describe("calibration math", () => {
  it("derives px-per-mm from a calibrated card width", () => {
    // 856px against an 85.6mm card => exactly 10 px/mm.
    expect(pxPerMm(856)).toBeCloseTo(10, 5);
    expect(pxPerMm(CARD_WIDTH_MM)).toBeCloseTo(1, 5);
  });

  it("converts pixels to mm with the factor", () => {
    expect(pxToMm(100, 10)).toBeCloseTo(10, 5);
    expect(pxToMm(135, 10)).toBeCloseTo(13.5, 5);
  });

  it("returns 0 mm for a non-positive factor instead of dividing by zero", () => {
    expect(pxToMm(100, 0)).toBe(0);
    expect(pxToMm(100, -5)).toBe(0);
  });
});

describe("mmToSize", () => {
  it("maps exact nominal widths to their size", () => {
    expect(mmToSize(18.0)).toBe(0);
    expect(mmToSize(13.5)).toBe(4);
    expect(mmToSize(12.5)).toBe(5);
    expect(mmToSize(8.0)).toBe(9);
  });

  it("snaps to the nearest size", () => {
    expect(mmToSize(15.4)).toBe(2); // closer to 15.5 than 14.5
    expect(mmToSize(14.6)).toBe(3); // closer to 14.5 than 15.5
  });

  it("clamps out-of-range widths to the extreme sizes", () => {
    expect(mmToSize(25)).toBe(0); // wider than thumb
    expect(mmToSize(4)).toBe(9); // narrower than pinky
  });

  it("keeps the wider size (smaller number) on an exact tie", () => {
    // 15.0 is equidistant from 15.5 (size 2) and 14.5 (size 3).
    expect(mmToSize(15.0)).toBe(2);
  });
});

describe("clampMm", () => {
  it("constrains values into the caliper range", () => {
    expect(clampMm(2)).toBe(MIN_MM);
    expect(clampMm(99)).toBe(MAX_MM);
    expect(clampMm(13)).toBe(13);
  });
});

describe("buildSymmetricMap", () => {
  it("mirrors a measured hand to both sides", () => {
    const map = buildSymmetricMap({
      thumb: 18,
      index: 13.5,
      middle: 14.5,
      ring: 12.5,
      pinky: 8,
    });
    expect(map.left).toEqual(map.right);
    expect(map.left.thumb).toBe(0);
    expect(map.left.pinky).toBe(9);
  });

  it("falls back to a mid size for unmeasured fingers", () => {
    const map = buildSymmetricMap({ thumb: 18 });
    expect(map.left.thumb).toBe(0);
    expect(map.left.index).toBe(5); // unmeasured -> mid
    expect(FINGERS.every((f) => typeof map.left[f] === "number")).toBe(true);
  });
});

describe("isComplete", () => {
  it("is true only when every finger is measured", () => {
    expect(isComplete({})).toBe(false);
    expect(isComplete({ thumb: 18, index: 14, middle: 15, ring: 13 })).toBe(false);
    expect(
      isComplete({ thumb: 18, index: 14, middle: 15, ring: 13, pinky: 9 }),
    ).toBe(true);
  });
});

describe("recommendSet", () => {
  const inStock = { id: "a", variants: { nodes: [{ id: "v1", availableForSale: true }] } };
  const soldOut = { id: "b", variants: { nodes: [{ id: "v2", availableForSale: false }] } };

  it("returns null for an empty catalog", () => {
    expect(recommendSet([])).toBeNull();
  });

  it("prefers a set with an available variant", () => {
    expect(recommendSet([soldOut, inStock])?.id).toBe("a");
  });

  it("falls back to the first set when none are in stock", () => {
    expect(recommendSet([soldOut])?.id).toBe("b");
  });
});

describe("firstVariantId", () => {
  it("prefers the first available variant", () => {
    const product = {
      variants: {
        nodes: [
          { id: "v1", availableForSale: false },
          { id: "v2", availableForSale: true },
        ],
      },
    };
    expect(firstVariantId(product)).toBe("v2");
  });

  it("falls back to the first variant, then null", () => {
    expect(
      firstVariantId({ variants: { nodes: [{ id: "v1", availableForSale: false }] } }),
    ).toBe("v1");
    expect(firstVariantId({ variants: { nodes: [] } })).toBeNull();
    expect(firstVariantId({})).toBeNull();
  });
});
