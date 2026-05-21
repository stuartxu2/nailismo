/**
 * Press-on nail sizing — pure, SSR-safe domain logic for the /fit guide.
 *
 * The interactive page never measures the screen directly. The user calibrates
 * once against a bank/ID card (a physical constant), which yields a px→mm scale
 * for their device. Every nail width is then derived from that scale and snapped
 * to Nailismo's 0–9 size scale.
 *
 * No React, no DOM (except thin localStorage guards) — unit-testable in isolation.
 */

/** Fingers, ordered widest → narrowest (thumb to pinky). */
export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;
export type FingerKey = (typeof FINGERS)[number];

export type HandKey = "left" | "right";

/** Nailismo size scale: 0 = widest (thumb), 9 = narrowest (pinky). */
export type NailSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** A finished map: a size for every finger on both hands. */
export type SizeMap = Record<HandKey, Record<FingerKey, NailSize>>;

/**
 * ISO/IEC 7810 ID-1 card width in mm — the calibration reference. Every bank
 * card, credit card, and most national ID cards share this exact width.
 */
export const CARD_WIDTH_MM = 85.6;

/**
 * Nominal nail-bed width (mm) per size. Domain constant.
 *
 * FLAG: these breakpoints must be confirmed against Nailismo's actual printed
 * size chart before launch. They currently span the 7–18mm range shown in the
 * homepage Fit section. Tune here only — every consumer reads from this table.
 */
export const SIZE_TABLE: { size: NailSize; mm: number }[] = [
  { size: 0, mm: 18.0 },
  { size: 1, mm: 16.5 },
  { size: 2, mm: 15.5 },
  { size: 3, mm: 14.5 },
  { size: 4, mm: 13.5 },
  { size: 5, mm: 12.5 },
  { size: 6, mm: 11.5 },
  { size: 7, mm: 10.5 },
  { size: 8, mm: 9.5 },
  { size: 9, mm: 8.0 },
];

/** Smallest / largest mm the caliper should allow, with a little slack. */
export const MIN_MM = 6;
export const MAX_MM = 22;

/** Pixels-per-mm for this device, from the calibrated card width in CSS px. */
export function pxPerMm(cardPixelWidth: number): number {
  return cardPixelWidth / CARD_WIDTH_MM;
}

/** Convert a pixel measurement to mm using a calibration factor. */
export function pxToMm(px: number, factor: number): number {
  if (factor <= 0) return 0;
  return px / factor;
}

/** Snap a nail-bed width (mm) to the nearest size on the 0–9 scale. */
export function mmToSize(mm: number): NailSize {
  let best = SIZE_TABLE[0];
  let bestDiff = Infinity;
  for (const row of SIZE_TABLE) {
    const diff = Math.abs(row.mm - mm);
    // Strict `<` keeps the wider size (smaller number) on exact ties.
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row;
    }
  }
  return best.size;
}

/** Clamp a mm value into the caliper's allowed range. */
export function clampMm(mm: number): number {
  return Math.min(MAX_MM, Math.max(MIN_MM, mm));
}

/**
 * Build a full both-hands size map from a single measured hand. We assume left
 * and right are symmetric (true for the overwhelming majority of users) and let
 * the UI override individual fingers afterward. Fingers with no measurement yet
 * fall back to the table's mid value so partial maps still render.
 */
export function buildSymmetricMap(
  fingerMm: Partial<Record<FingerKey, number>>,
): SizeMap {
  const oneHand = {} as Record<FingerKey, NailSize>;
  for (const finger of FINGERS) {
    const mm = fingerMm[finger];
    oneHand[finger] = mm == null ? 5 : mmToSize(mm);
  }
  return { left: { ...oneHand }, right: { ...oneHand } };
}

/** True once every finger on the measured hand has a width. */
export function isComplete(fingerMm: Partial<Record<FingerKey, number>>): boolean {
  return FINGERS.every((f) => typeof fingerMm[f] === "number");
}

/**
 * Pick the starter set to recommend. Every Nailismo starter set ships the full
 * size range, so the choice is editorial, not size-matched: the first set with
 * an available variant, falling back to the first set, or null if none exist.
 */
export function recommendSet<
  T extends { variants?: { nodes: { id: string; availableForSale: boolean }[] } },
>(products: T[]): T | null {
  if (products.length === 0) return null;
  const inStock = products.find((p) =>
    p.variants?.nodes.some((v) => v.availableForSale),
  );
  return inStock ?? products[0];
}

/** First purchasable variant id for a product, or null. */
export function firstVariantId(product: {
  variants?: { nodes: { id: string; availableForSale: boolean }[] };
}): string | null {
  const variant =
    product.variants?.nodes.find((v) => v.availableForSale) ??
    product.variants?.nodes[0];
  return variant?.id ?? null;
}

// ---------------------------------------------------------------------------
// Persistence — resume an in-progress fitting after a reload. Thin window
// guards keep this importable from server components without throwing.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "nailismo_fit_v1";

export type SavedFit = {
  version: 1;
  /** Calibrated card width in CSS px, or null if not yet calibrated. */
  cardPxWidth: number | null;
  /** Measured nail-bed width (mm) per finger on the user's measured hand. */
  fingerMm: Partial<Record<FingerKey, number>>;
};

export function loadFit(): SavedFit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedFit;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFit(state: SavedFit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode) — fitting still works in-memory.
  }
}

export function clearFit(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
