// Map Shopify color tags to swatch hexes (mirrors the web shop tiles, which
// drive their dots from product color tags). Non-color tags (e.g. "featured")
// are ignored.
export const TAG_COLORS: Record<string, string> = {
  Black: "#271028",
  White: "#FFFFFF",
  Silver: "#C9CCD6",
  Nude: "#E8C9B0",
  Blue: "#7AB8FF",
  Green: "#7BD389",
  Red: "#FF6B6B",
  Gold: "#E8C24A",
  Pink: "#FF7AC6",
  Purple: "#B98CFF",
};

export function tagDots(tags: string[]): { tag: string; hex: string }[] {
  return tags.filter((t) => TAG_COLORS[t]).map((t) => ({ tag: t, hex: TAG_COLORS[t] }));
}
