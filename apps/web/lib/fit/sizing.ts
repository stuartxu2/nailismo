/**
 * Press-on nail sizing — pure, SSR-safe domain logic for the /fit guide.
 *
 * The interactive page never measures the screen directly. The user calibrates
 * once against a bank/ID card (a physical constant), which yields a px→mm scale
 * for their device. Every nail width is then derived from that scale and matched
 * against Nailismo's printed S/M/L/XL set-size chart.
 *
 * Sets are sold as a single size (S/M/L/XL) — one tray that fits the whole hand
 * — so the guide measures all five nails and aggregates them into ONE set size
 * that maps straight onto a Shopify "Size" variant.
 *
 * No React, no DOM (except thin localStorage guards) — unit-testable in isolation.
 */

/** Fingers, ordered widest → narrowest (thumb to little). */
export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;
export type FingerKey = (typeof FINGERS)[number];

/** The four set sizes Nailismo sells, narrowest → widest. */
export const SET_SIZES = ["S", "M", "L", "XL"] as const;
export type SetSize = (typeof SET_SIZES)[number];

/**
 * ISO/IEC 7810 ID-1 card width in mm — the calibration reference. Every bank
 * card, credit card, and most national ID cards share this exact width.
 */
export const CARD_WIDTH_MM = 85.6;

/**
 * Nailismo's official printed size chart: nail-bed width (mm) per finger, per
 * set size. Source of truth for the whole guide — every size decision reads
 * from this table. The chart steps a clean +1mm per size on every finger.
 */
export const SIZE_CHART: Record<FingerKey, Record<SetSize, number>> = {
  thumb: { S: 14, M: 15, L: 16, XL: 17 },
  index: { S: 10, M: 11, L: 12, XL: 13 },
  middle: { S: 11, M: 12, L: 13, XL: 14 },
  ring: { S: 10, M: 11, L: 12, XL: 13 },
  pinky: { S: 7, M: 8, L: 9, XL: 10 },
};

/** Smallest / largest mm the caliper should allow, with slack around the chart. */
export const MIN_MM = 5;
export const MAX_MM = 20;

/** Pixels-per-mm for this device, from the calibrated card width in CSS px. */
export function pxPerMm(cardPixelWidth: number): number {
  return cardPixelWidth / CARD_WIDTH_MM;
}

/** Convert a pixel measurement to mm using a calibration factor. */
export function pxToMm(px: number, factor: number): number {
  if (factor <= 0) return 0;
  return px / factor;
}

/** Clamp a mm value into the caliper's allowed range. */
export function clampMm(mm: number): number {
  return Math.min(MAX_MM, Math.max(MIN_MM, mm));
}

/**
 * Continuous set-size position (0 = S … 3 = XL) for a single finger at a given
 * width. The chart steps +1mm per size, so the offset from the S baseline IS
 * the size index. Clamped to the chart's range so one oversized nail can't drag
 * the aggregate off the scale.
 */
function sizeIndexForFinger(finger: FingerKey, mm: number): number {
  const offset = mm - SIZE_CHART[finger].S;
  return Math.min(SET_SIZES.length - 1, Math.max(0, offset));
}

/** Nearest set size for a single finger's measured width. Ties round up. */
export function sizeFromMm(finger: FingerKey, mm: number): SetSize {
  const idx = Math.round(sizeIndexForFinger(finger, mm));
  return SET_SIZES[idx];
}

/**
 * Aggregate measured nails into one recommended set size. Each finger votes a
 * continuous size index; we average the votes and round to the nearest size.
 * Ties round UP — a slightly large nail can be filed down, a small one can't be
 * stretched. Returns null until at least one nail is measured.
 */
export function sizeFromMeasurements(
  fingerMm: Partial<Record<FingerKey, number>>,
): SetSize | null {
  const indices: number[] = [];
  for (const finger of FINGERS) {
    const mm = fingerMm[finger];
    if (typeof mm === "number") indices.push(sizeIndexForFinger(finger, mm));
  }
  if (indices.length === 0) return null;
  const avg = indices.reduce((a, b) => a + b, 0) / indices.length;
  const idx = Math.min(SET_SIZES.length - 1, Math.max(0, Math.round(avg)));
  return SET_SIZES[idx];
}

/** True once every finger on the measured hand has a width. */
export function isComplete(fingerMm: Partial<Record<FingerKey, number>>): boolean {
  return FINGERS.every((f) => typeof fingerMm[f] === "number");
}

/**
 * Pick the starter set to recommend. Every Nailismo starter set ships all four
 * sizes, so the choice of product is editorial, not size-matched: the first set
 * with an available variant, falling back to the first set, or null if none.
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

type VariantNode = {
  id: string;
  availableForSale: boolean;
  selectedOptions?: { name: string; value: string }[];
};

/**
 * Variant id for a product's "Size" option matching the given set size. Prefers
 * a purchasable variant, falls back to the matching variant even if sold out,
 * then null. Used to wire Add-to-Cart straight to the user's computed size.
 */
export function variantForSize(
  product: { variants?: { nodes: VariantNode[] } },
  size: SetSize,
): string | null {
  const nodes = product.variants?.nodes ?? [];
  const matches = nodes.filter((v) =>
    v.selectedOptions?.some((o) => o.name === "Size" && o.value === size),
  );
  const pick = matches.find((v) => v.availableForSale) ?? matches[0];
  return pick?.id ?? null;
}

/** First purchasable variant id for a product, or null. The size-agnostic fallback. */
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
