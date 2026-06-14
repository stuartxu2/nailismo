import { describe, it, expect } from "vitest";
import { parseReviews, aggregate } from "./reviews";

const one = JSON.stringify([
  { author: "Riley P.", rating: 5, body: "Stayed on all week.", date: "2026-06-13" },
]);

describe("parseReviews", () => {
  it("returns [] for null/undefined/empty", () => {
    expect(parseReviews(null)).toEqual([]);
    expect(parseReviews(undefined)).toEqual([]);
    expect(parseReviews("")).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    expect(parseReviews("{not json")).toEqual([]);
  });

  it("returns [] when the JSON is not an array", () => {
    expect(parseReviews(JSON.stringify({ author: "x" }))).toEqual([]);
  });

  it("parses a valid review", () => {
    const out = parseReviews(one);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: "Riley P.", rating: 5, body: "Stayed on all week.", date: "2026-06-13" });
  });

  it("drops rows missing author/body/date", () => {
    const raw = JSON.stringify([
      { rating: 5, body: "no author", date: "2026-06-13" },
      { author: "A", rating: 5, date: "2026-06-13" },
      { author: "B", rating: 5, body: "no date" },
    ]);
    expect(parseReviews(raw)).toEqual([]);
  });

  it("drops rows whose rating is out of 1..5", () => {
    const raw = JSON.stringify([
      { author: "A", rating: 0, body: "x", date: "2026-06-13" },
      { author: "B", rating: 6, body: "x", date: "2026-06-13" },
    ]);
    expect(parseReviews(raw)).toEqual([]);
  });

  it("rounds fractional ratings and coerces flags", () => {
    const raw = JSON.stringify([
      { author: "A", rating: 4.4, body: "x", date: "2026-06-13", verified: true, incentivized: 1 },
    ]);
    const out = parseReviews(raw);
    expect(out[0].rating).toBe(4);
    expect(out[0].verified).toBe(true);
    expect(out[0].incentivized).toBe(false); // only strict true counts
  });
});

describe("aggregate", () => {
  it("returns null for an empty list", () => {
    expect(aggregate([])).toBeNull();
  });

  it("computes count and average rounded to one decimal", () => {
    const out = parseReviews(JSON.stringify([
      { author: "A", rating: 5, body: "x", date: "2026-06-13" },
      { author: "B", rating: 5, body: "x", date: "2026-06-13" },
      { author: "C", rating: 4, body: "x", date: "2026-06-13" },
    ]));
    expect(aggregate(out)).toEqual({ ratingValue: 4.7, reviewCount: 3 });
  });
});
