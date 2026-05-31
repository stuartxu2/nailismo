/**
 * Nailismo shared design tokens.
 *
 * Mirrors the LIVE web theme (apps/web/app/globals.css :root) — the candy
 * lilac / plum / lime / slate scheme that actually ships — so the mobile app
 * reads as the same brand. Source of truth for brand colors stays in
 * brand_assets/ + globals.css; this is the typed, platform-neutral export.
 */

export const colors = {
  /** Lilac page background. */
  bg: "#E6D5EB",
  /** Clean white surface — cards, sheets, modals. */
  surface: "#FFFFFF",
  /** Lilac borders / dividers. */
  border: "#C9B6D2",
  /** Plum ink — primary text + dark UI. */
  ink: "#271028",
  /** Slate — nav, labels, captions. */
  muted: "#60779F",
  /** Muted plum-gray — secondary text. */
  subtle: "#6E5E72",
  /** Deep slate — links + active accent. */
  accent: "#4F6796",
  /** Lime — primary CTA + badge pop. */
  pop: "#9FED40",
  /** On-pop / on-accent text. */
  onPop: "#271028",
  onAccent: "#E6D5EB",
} as const;

export type ColorToken = keyof typeof colors;

/** Hairline overlays (plum at low alpha), matching globals.css. */
export const hairlines = {
  hair: "rgba(39,16,40,0.14)",
  hairStrong: "rgba(39,16,40,0.28)",
  hairDark: "rgba(230,213,235,0.18)",
} as const;

/**
 * Brand font families. Display = Fredoka (chunky rounded, candy-pop), body =
 * Nunito, mono = Akkurat Mono. On mobile these are the family names registered
 * via expo-font; load the matching files from brand_assets/ or Google Fonts.
 */
export const fonts = {
  display: "Fredoka",
  body: "Nunito",
  mono: "AkkuratMono",
} as const;

/** Shared radii — soft, candy-rounded. */
export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;
