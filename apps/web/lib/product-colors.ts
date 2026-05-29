// Maps a product's color tags (applied by tools/shopify_color_tags.py,
// dominant color first) to swatch dots shown on product cards. Falls back to a
// decorative palette keyed by grid index when a product has no color tag.

export type ColorDot = { name: string; hex: string };

// Color tag → swatch hex.
export const COLOR_HEX: Record<string, string> = {
  Black: "#271028",
  White: "#FFFFFF",
  Silver: "#C5CAD3",
  Gold: "#D4AF37",
  Red: "#E2342B",
  Blue: "#3B6FB5",
  Green: "#4FAE35",
  Grey: "#9AA0A8",
  Brown: "#8B5A2B",
  Nude: "#E6C2A6",
};

// Decorative fallback palette (candy theme) for products without color tags.
const SWATCHES = ["#9FED40", "#60779F", "#271028", "#C9B6D2", "#6FBF1F"];

/** Real color dots from a product's tags (dominant-first), capped at 2. */
export function colorDots(tags: string[]): ColorDot[] {
  return tags
    .filter((t) => t in COLOR_HEX)
    .slice(0, 2)
    .map((name) => ({ name, hex: COLOR_HEX[name] }));
}

/** Two decorative dots keyed by grid index, for products lacking color tags. */
export function swatchFallback(i: number): ColorDot[] {
  return [
    { name: "", hex: SWATCHES[i % SWATCHES.length] },
    { name: "", hex: SWATCHES[(i + 2) % SWATCHES.length] },
  ];
}

/** Color dots for a card: real tags if present, else decorative fallback. */
export function cardDots(tags: string[], i: number): { dots: ColorDot[]; labeled: boolean } {
  const real = colorDots(tags);
  return real.length ? { dots: real, labeled: true } : { dots: swatchFallback(i), labeled: false };
}
