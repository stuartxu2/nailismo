// Server-side prompt assembly for the 3 design mockups.
//
// Three fixed variation angles (flat-lay / on-model / minimal) guarantee a
// genuine spread, not near-duplicates. Two of them lean on a fixed brand asset
// (a second reference image) so output stays unmistakably Nailismo. User text
// ({NOTE}) is sanitized and embedded only as a short aesthetic aside — never as
// free-form instructions.

export type PromptInput = {
  /** Server-derived palette/motif/mood descriptor of the upload ({REF}). */
  referenceDescriptor: string;
  /** Shape/length pick ({SHAPE}); defaults to "medium almond". */
  shape?: string;
  /** Raw, untrusted user note ({NOTE}). */
  note?: string;
};

export type BrandAsset = "flatlay" | "model";

export type DesignPrompt = {
  slot: 0 | 1 | 2;
  variation: "flatlay" | "on-model" | "minimal";
  seed: number;
  prompt: string;
  /** Fixed brand asset to attach as the *second* reference image, if any. */
  brandAsset?: BrandAsset;
};

const SEEDS = [101, 202, 303] as const;
const DEFAULT_SHAPE = "medium almond";
const NEGATIVE = "Do not render: extra fingers, distorted hands, text, logos, watermarks, blur.";
const FRAMING =
  "A set of press-on false nails arranged and also shown worn on one realistic hand, studio product photography, soft diffused lighting, clean light-grey seamless background, ultra-detailed glossy finish, photoreal, 2k.";

/**
 * Reduce an untrusted note to a short, safe aesthetic aside: single line, no
 * markup/brace chars, common injection verbs dropped, length-capped. This is
 * defense-in-depth — the prompt structure (fixed framing + "this is nail art")
 * is the primary guardrail.
 */
export function sanitizeNote(note?: string): string {
  if (!note) return "";
  return note
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>{}]/g, "")
    .replace(/\b(ignore|disregard|forget|override|system|assistant|instructions?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 200);
}

function noteClause(note?: string): string {
  const n = sanitizeNote(note);
  return n ? ` ${n}.` : "";
}

export function buildPrompts(input: PromptInput): DesignPrompt[] {
  const shape = (input.shape?.trim() || DEFAULT_SHAPE).toLowerCase();
  const ref = input.referenceDescriptor.trim();
  const note = noteClause(input.note);

  const flatlay =
    `Match the styling of the second reference image exactly: a full set of 10 short ${shape} ` +
    `press-on nails graded by size, arranged in the same diagonal flat-lay on a pale blue-grey ` +
    `seamless background, soft even studio lighting, gentle shadows, no hand, photoreal, 2k. ` +
    `Instead of blank nails, apply the design from the first reference (${ref}): faithfully ` +
    `reproduce its colors, patterns and key motifs across all ten nails as a cohesive set, ` +
    `balanced so no nail is overcrowded.${note} Keep the layout, background and lighting ` +
    `identical to the second reference; change ONLY the nail art. ${NEGATIVE}`;

  const onModel =
    `Use the second reference image only for the person, pose and scene. Render that person ` +
    `wearing a custom press-on set derived from the first reference image (${ref}): ${shape}, ` +
    `the design wrapped cleanly across all visible nails, salon-quality, photoreal, 2k.${note} ` +
    `Keep the person's identity, pose, framing, clothing and lighting faithful to the second ` +
    `reference; change ONLY the nail art. Editorial, Gen-Z, unisex, aspirational. ${NEGATIVE}`;

  const minimal =
    `${FRAMING} ${shape} nails. A refined minimal set inspired by this reference (${ref}): pull ` +
    `only the 1-2 strongest colors and one signature motif, applied as tasteful accents over a ` +
    `clean neutral or sheer base, most nails simple with 2-3 statement accent nails.${note} ` +
    `Understated, elegant, everyday-wearable. ${NEGATIVE}`;

  return [
    { slot: 0, variation: "flatlay", seed: SEEDS[0], prompt: flatlay, brandAsset: "flatlay" },
    { slot: 1, variation: "on-model", seed: SEEDS[1], prompt: onModel, brandAsset: "model" },
    { slot: 2, variation: "minimal", seed: SEEDS[2], prompt: minimal },
  ];
}
