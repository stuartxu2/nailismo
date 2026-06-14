import { describe, it, expect } from "vitest";
import { mapJudgemeReviews } from "./judgeme";

describe("mapJudgemeReviews", () => {
  it("returns [] for non-array input", () => {
    expect(mapJudgemeReviews(null)).toEqual([]);
    expect(mapJudgemeReviews(undefined)).toEqual([]);
    expect(mapJudgemeReviews({})).toEqual([]);
    expect(mapJudgemeReviews("nope")).toEqual([]);
  });

  it("maps a well-formed Judge.me review to the shared Review shape", () => {
    const out = mapJudgemeReviews([
      {
        rating: 5,
        title: "Stunning",
        body: "Lasted the whole week.",
        created_at: "2026-06-10T14:22:00.000Z",
        verified: "buyer",
        published: true,
        hidden: false,
        reviewer: { name: "Mika T." },
      },
    ]);
    expect(out).toEqual([
      {
        author: "Mika T.",
        rating: 5,
        title: "Stunning",
        body: "Lasted the whole week.",
        date: "2026-06-10",
        verified: true,
      },
    ]);
  });

  it("drops hidden, unpublished, and spam reviews", () => {
    const base = {
      rating: 4,
      body: "ok",
      created_at: "2026-06-01T00:00:00Z",
      reviewer: { name: "A" },
    };
    const out = mapJudgemeReviews([
      { ...base, hidden: true },
      { ...base, published: false },
      { ...base, curated: "spam" },
    ]);
    expect(out).toEqual([]);
  });

  it("drops reviews with no body or an out-of-range rating", () => {
    const out = mapJudgemeReviews([
      { rating: 5, body: "   ", created_at: "2026-06-01T00:00:00Z" },
      { rating: 0, body: "bad rating", created_at: "2026-06-01T00:00:00Z" },
      { rating: 9, body: "too high", created_at: "2026-06-01T00:00:00Z" },
      { body: "no rating", created_at: "2026-06-01T00:00:00Z" },
    ]);
    expect(out).toEqual([]);
  });

  it("falls back to a generic author and treats verified=no / missing as unverified", () => {
    const out = mapJudgemeReviews([
      {
        rating: 3,
        body: "fine",
        created_at: "2026-05-20T09:00:00Z",
        verified: "no",
        reviewer: {},
      },
    ]);
    expect(out).toEqual([
      { author: "Verified Buyer", rating: 3, body: "fine", date: "2026-05-20", verified: false },
    ]);
  });

  it("rounds fractional ratings to the nearest integer", () => {
    const out = mapJudgemeReviews([
      { rating: 4.6, body: "x", created_at: "2026-05-20T00:00:00Z", reviewer: { name: "B" } },
    ]);
    expect(out[0].rating).toBe(5);
  });
});
