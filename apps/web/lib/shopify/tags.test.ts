import { describe, it, expect } from "vitest";
import { displayTags } from "./tags";

describe("displayTags", () => {
  it("hides the internal bundle-eligibility tag and keeps order", () => {
    expect(displayTags(["Black", "Nail Set", "White"])).toEqual(["Black", "White"]);
  });

  it("returns shopper-facing tags unchanged", () => {
    expect(displayTags(["Blue", "New Arrival"])).toEqual(["Blue", "New Arrival"]);
  });
});
