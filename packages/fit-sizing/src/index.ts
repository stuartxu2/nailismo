/**
 * Press-on nail sizing — pure, platform-agnostic domain logic.
 *
 * A user calibrates once against a bank/ID card (a physical constant), which
 * yields a px→mm scale. Every nail width is derived from that scale and matched
 * against Nailismo's printed S/M/L/XL set-size chart.
 *
 * Sets are sold as a single size (S/M/L/XL) — one tray that fits the whole hand
 * — so the guide measures all five nails and aggregates them into ONE set size
 * that maps straight onto a Shopify "Size" variant.
 *
 * No React, no DOM, no storage — shared verbatim by web (/fit) and the mobile
 * camera flow. Persistence (localStorage / AsyncStorage) lives per-platform.
 */

/** Fingers, ordered widest → narrowest (thumb to little). */
export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;
export type FingerKey = (typeof FINGERS)[number];

/**
 * The four nails the top-down camera can actually measure. The thumb is
 * excluded: with the hand flat palm-down its nail plane sits ~90° to these
 * four, so a straight-down photo only ever sees the thumb nail edge-on and its
 * width is unrecoverable. The thumb is derived from a sibling instead.
 */
export const MEASURED_FINGERS = ["index", "middle", "ring", "pinky"] as const;

/**
 * Chart offsets used to estimate the thumb. The printed chart is exact and
 * constant: thumb = middle + 3mm and thumb = index + 4mm at every size.
 */
export const THUMB_OFFSET_FROM_MIDDLE_MM = 3;
export const THUMB_OFFSET_FROM_INDEX_MM = 4;

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

/** Pixels-per-mm for this device, from the calibrated card width in px. */
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
 * Estimate the thumb's nail-bed width (mm) from a measured sibling finger.
 * Prefers the middle finger (+3mm), falls back to the index (+4mm), and returns
 * null when neither is available. The result is clamped to the caliper range.
 *
 * Display-only: the derived thumb is shown to the user but must NOT be fed into
 * `sizeFromMeasurements` — it carries no independent information and would only
 * re-weight the middle finger's vote.
 */
export function deriveThumbMm(
  fingerMm: Partial<Record<FingerKey, number>>,
): number | null {
  if (typeof fingerMm.middle === "number") {
    return clampMm(fingerMm.middle + THUMB_OFFSET_FROM_MIDDLE_MM);
  }
  if (typeof fingerMm.index === "number") {
    return clampMm(fingerMm.index + THUMB_OFFSET_FROM_INDEX_MM);
  }
  return null;
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
 * Aggregate the four measured fingers (index, middle, ring, pinky) into one
 * recommended set size. Each finger votes a continuous size index; we average
 * the votes and round to the nearest size. Ties round UP — a slightly large
 * nail can be filed down, a small one can't be stretched. Returns null until
 * at least one measured finger has a value. Any thumb entry in the map is
 * ignored: the thumb is derived for display only and never votes.
 */
export function sizeFromMeasurements(
  fingerMm: Partial<Record<FingerKey, number>>,
): SetSize | null {
  const indices: number[] = [];
  for (const finger of MEASURED_FINGERS) {
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

/**
 * A saved fitting — enough to resume or recall a user's size. `cardPxWidth` is
 * the calibrated card width in px for the device/photo it was measured on.
 * Persistence is platform-specific (web: localStorage, mobile: AsyncStorage).
 */
export type SavedFit = {
  version: 1;
  cardPxWidth: number | null;
  fingerMm: Partial<Record<FingerKey, number>>;
};
