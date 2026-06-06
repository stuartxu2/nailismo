import { describe, it, expect } from "vitest";
import { buildGuideJsonLd } from "./guideSchema";

const URL = "https://nailismo.com/journal/how-to-apply-press-on-nails";

describe("buildGuideJsonLd", () => {
  it("returns [] for an unknown handle", () => {
    expect(buildGuideJsonLd("not-a-guide", "x", URL)).toEqual([]);
  });

  it("emits HowTo + FAQPage for a how-to guide", () => {
    const out = buildGuideJsonLd("how-to-apply-press-on-nails", "How to Apply", URL);
    const types = out.map((o) => (o as { "@type": string })["@type"]);
    expect(types).toContain("HowTo");
    expect(types).toContain("FAQPage");
    const howTo = out.find((o) => (o as { "@type": string })["@type"] === "HowTo") as {
      step: unknown[];
    };
    expect(howTo.step.length).toBeGreaterThanOrEqual(3);
  });

  it("emits only FAQPage for the comparison guide (no HowTo)", () => {
    const out = buildGuideJsonLd("press-ons-vs-gel-vs-acrylic", "Compare", URL);
    const types = out.map((o) => (o as { "@type": string })["@type"]);
    expect(types).toEqual(["FAQPage"]);
  });
});
