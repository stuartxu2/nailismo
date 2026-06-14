import { describe, it, expect } from "vitest";
import {
  pxPerMm,
  pxToMm,
  clampMm,
  sizeFromMm,
  sizeFromMeasurements,
  isComplete,
  recommendSet,
  variantForSize,
  firstVariantId,
  SIZE_CHART,
  SET_SIZES,
  CARD_WIDTH_MM,
  FINGERS,
  MIN_MM,
  MAX_MM,
  deriveThumbMm,
  MEASURED_FINGERS,
  THUMB_OFFSET_FROM_MIDDLE_MM,
  THUMB_OFFSET_FROM_INDEX_MM,
} from "./index";

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

describe("SIZE_CHART", () => {
  it("steps a clean +1mm per size on every finger", () => {
    for (const finger of FINGERS) {
      const row = SIZE_CHART[finger];
      expect(row.M - row.S).toBe(1);
      expect(row.L - row.M).toBe(1);
      expect(row.XL - row.L).toBe(1);
    }
  });
});

describe("clampMm", () => {
  it("constrains values into the caliper range", () => {
    expect(clampMm(2)).toBe(MIN_MM);
    expect(clampMm(99)).toBe(MAX_MM);
    expect(clampMm(13)).toBe(13);
  });
});

describe("sizeFromMm", () => {
  it("maps each chart width to its exact size", () => {
    expect(sizeFromMm("thumb", 14)).toBe("S");
    expect(sizeFromMm("thumb", 15)).toBe("M");
    expect(sizeFromMm("thumb", 16)).toBe("L");
    expect(sizeFromMm("thumb", 17)).toBe("XL");
    expect(sizeFromMm("pinky", 7)).toBe("S");
    expect(sizeFromMm("pinky", 10)).toBe("XL");
  });

  it("snaps to the nearest size", () => {
    expect(sizeFromMm("thumb", 15.4)).toBe("M"); // closer to 15 than 16
    expect(sizeFromMm("thumb", 15.6)).toBe("L"); // closer to 16 than 15
  });

  it("rounds up on an exact tie (better slightly large)", () => {
    // thumb 15.5 is equidistant from M(15) and L(16) -> size up to L.
    expect(sizeFromMm("thumb", 15.5)).toBe("L");
  });

  it("clamps widths beyond the chart to the extreme sizes", () => {
    expect(sizeFromMm("thumb", 25)).toBe("XL");
    expect(sizeFromMm("pinky", 2)).toBe("S");
  });
});

describe("sizeFromMeasurements", () => {
  it("returns the matching size when every nail sits on one chart row", () => {
    const sRow = Object.fromEntries(FINGERS.map((f) => [f, SIZE_CHART[f].S]));
    const lRow = Object.fromEntries(FINGERS.map((f) => [f, SIZE_CHART[f].L]));
    expect(sizeFromMeasurements(sRow)).toBe("S");
    expect(sizeFromMeasurements(lRow)).toBe("L");
  });

  it("averages mixed nails and rounds to the nearest size", () => {
    // thumb at M(15), rest at S -> avg index 0.2 -> S.
    expect(
      sizeFromMeasurements({ thumb: 15, index: 10, middle: 11, ring: 10, pinky: 7 }),
    ).toBe("S");
    // three nails at L, two at M -> avg index 1.6 -> L.
    expect(
      sizeFromMeasurements({ thumb: 16, index: 12, middle: 13, ring: 11, pinky: 8 }),
    ).toBe("L");
  });

  it("works from a partial measurement of the measured fingers", () => {
    expect(sizeFromMeasurements({ index: 13 })).toBe("XL");
  });

  it("ignores the thumb — it never votes, even when present", () => {
    const measured = { index: 10, middle: 11, ring: 10, pinky: 7 };
    expect(sizeFromMeasurements(measured)).toBe("S");
    expect(sizeFromMeasurements({ ...measured, thumb: 99 })).toBe("S");
    expect(sizeFromMeasurements({ thumb: 17 })).toBeNull();
  });

  it("returns null before any nail is measured", () => {
    expect(sizeFromMeasurements({})).toBeNull();
  });
});

describe("isComplete", () => {
  it("is true only when every finger is measured", () => {
    expect(isComplete({})).toBe(false);
    expect(isComplete({ thumb: 15, index: 11, middle: 12, ring: 11 })).toBe(false);
    expect(
      isComplete({ thumb: 15, index: 11, middle: 12, ring: 11, pinky: 8 }),
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

describe("variantForSize", () => {
  const product = {
    variants: {
      nodes: [
        { id: "s", availableForSale: true, selectedOptions: [{ name: "Size", value: "S" }] },
        { id: "m-out", availableForSale: false, selectedOptions: [{ name: "Size", value: "M" }] },
        { id: "l", availableForSale: true, selectedOptions: [{ name: "Size", value: "L" }] },
      ],
    },
  };

  it("matches the Size option to a set size", () => {
    expect(variantForSize(product, "S")).toBe("s");
    expect(variantForSize(product, "L")).toBe("l");
  });

  it("returns the matching variant even when it is sold out", () => {
    expect(variantForSize(product, "M")).toBe("m-out");
  });

  it("returns null when no variant carries that size", () => {
    expect(variantForSize(product, "XL")).toBeNull();
    expect(variantForSize({ variants: { nodes: [] } }, "S")).toBeNull();
    expect(variantForSize({}, "S")).toBeNull();
  });

  it("prefers the available variant when a size repeats", () => {
    const dup = {
      variants: {
        nodes: [
          { id: "m1", availableForSale: false, selectedOptions: [{ name: "Size", value: "M" }] },
          { id: "m2", availableForSale: true, selectedOptions: [{ name: "Size", value: "M" }] },
        ],
      },
    };
    expect(variantForSize(dup, "M")).toBe("m2");
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

describe("SET_SIZES", () => {
  it("is ordered narrowest to widest", () => {
    expect(SET_SIZES).toEqual(["S", "M", "L", "XL"]);
  });
});

describe("MEASURED_FINGERS", () => {
  it("is the four camera-facing nails, excluding the thumb", () => {
    expect(MEASURED_FINGERS).toEqual(["index", "middle", "ring", "pinky"]);
    expect(MEASURED_FINGERS).not.toContain("thumb");
  });
});

describe("deriveThumbMm", () => {
  it("estimates the thumb from the middle finger (+3mm)", () => {
    expect(deriveThumbMm({ middle: 12 })).toBe(15);
  });

  it("falls back to the index finger (+4mm) when middle is absent", () => {
    expect(deriveThumbMm({ index: 11 })).toBe(15);
  });

  it("prefers the middle finger when both are present", () => {
    expect(deriveThumbMm({ middle: 12, index: 99 })).toBe(15);
  });

  it("returns null when neither middle nor index is measured", () => {
    expect(deriveThumbMm({ ring: 11, pinky: 8 })).toBeNull();
    expect(deriveThumbMm({})).toBeNull();
  });

  it("clamps the derived value into the caliper range", () => {
    expect(deriveThumbMm({ middle: 19 })).toBe(MAX_MM); // 19+3=22 -> 20
  });

  it("uses the exact, constant chart offsets it estimates from", () => {
    for (const size of SET_SIZES) {
      expect(SIZE_CHART.thumb[size] - SIZE_CHART.middle[size]).toBe(
        THUMB_OFFSET_FROM_MIDDLE_MM,
      );
      expect(SIZE_CHART.thumb[size] - SIZE_CHART.index[size]).toBe(
        THUMB_OFFSET_FROM_INDEX_MM,
      );
    }
  });
});
