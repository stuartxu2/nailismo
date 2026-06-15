// Server-side prompt assembly for the 3 mockups.
//
// Strategy: 3 VIEWS OF ONE DESIGN (not 3 different designs).
//  - slot 0 "flatlay": the canonical design — an artisan, hand-paintable
//    interpretation of the upload (paint + mixed-media embellishments), shot in
//    the brand flat-lay style. This is the single source of truth.
//  - slot 1 "hand":    the SAME design worn on a photogenic hand.
//  - slot 2 "package":  the SAME design presented in the retail kit.
// Slots 1 & 2 are anchored on slot 0's *output image* at generation time (see
// `base`), so all three share one design. User text ({NOTE}) is sanitized and
// only steers the canonical design (slot 0); the derived views copy it verbatim.

export type PromptInput = {
  /** Server-derived palette/motif/mood descriptor of the upload ({REF}). */
  referenceDescriptor: string;
  /** Shape/length pick ({SHAPE}); defaults to "medium almond". */
  shape?: string;
  /** Raw, untrusted user note ({NOTE}). */
  note?: string;
};

export type BrandAsset = "flatlay" | "package";

/** Primary reference source: the customer upload, or slot 0's generated design. */
export type BaseRef = "upload" | "design";

export type DesignPrompt = {
  slot: 0 | 1 | 2;
  variation: "flatlay" | "hand" | "package";
  seed: number;
  prompt: string;
  /** Which image is the primary reference (refs[0]) at generation time. */
  base: BaseRef;
  /** Fixed brand asset to attach as the *second* reference image, if any. */
  brandAsset?: BrandAsset;
};

const SEEDS = [101, 202, 303] as const;
const DEFAULT_SHAPE = "medium almond";
const NEGATIVE = "Do not render: extra fingers, distorted hands, text, logos, watermarks, blur.";

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

  // slot 0 — canonical, artisan hand-painted design in the brand flat-lay style.
  const flatlay =
    `Match the styling of the second reference image exactly: a full set of 10 short ${shape} ` +
    `press-on nails graded by size, arranged in the same diagonal flat-lay on a pale blue-grey ` +
    `seamless background, soft even studio lighting, gentle shadows, no hand, photoreal, 2k. ` +
    `Interpret the first reference (${ref}) as an artisan, 100% hand-painted nail-art set: ` +
    `translate it into a simplified, slightly abstract design — bold shapes, clean color blocks ` +
    `and loose, organic brushwork a nail artist could realistically paint by hand, not a ` +
    `photographic copy. Build the look from paint plus mixed-media embellishments: a few ` +
    `rhinestones or gems, tiny pearls, gold-foil flakes, small charms and little decals/stickers, ` +
    `placed tastefully as accents on 2-4 nails with the rest kept simpler.${note} Keep the layout, ` +
    `background and lighting identical to the second reference; change ONLY the nail art. ${NEGATIVE}`;

  // slot 1 — the SAME design, worn on a realistic hand (refs: slot 0 output only).
  const hand =
    `Ultra-realistic, photogenic close-up photograph of one elegant human hand wearing ` +
    `salon-quality press-on nails painted EXACTLY like the nails in the reference image: ` +
    `reproduce the identical hand-painted design — same colors, patterns, finish, applied gems, ` +
    `charms and stickers, and ${shape} shape — on every nail, with no deviation. Natural healthy ` +
    `skin and well-groomed cuticles, soft diffused studio lighting, shallow depth of field, ` +
    `tasteful clean neutral background, editorial beauty photography, photoreal, 2k. Present the ` +
    `SAME design worn on a real hand; do not redesign the nails. ${NEGATIVE}`;

  // slot 2 — the SAME design, presented in the retail kit (refs: slot 0 output + package asset).
  const pkg =
    `Match the styling of the second reference image exactly: a flat-lay of the Nailismo press-on ` +
    `nail kit on a pastel colour-blocked geometric background — a black branded box with a clear ` +
    `window showing the nail set, a sheet of teardrop adhesive tabs, a sterile alcohol prep pad, ` +
    `a slim wooden cuticle stick and a teal nail file, soft even studio lighting, gentle shadows, ` +
    `photoreal, 2k. Render the press-on nails — both in the box window and as the set — painted ` +
    `EXACTLY like the nails in the FIRST reference image: identical design, colors, patterns, ` +
    `finish and any 3D embellishments (gems, charms, stickers), ${shape}. Keep the packaging ` +
    `layout, props, background and lighting identical to the second reference; change ONLY the ` +
    `nail art shown. ${NEGATIVE}`;

  return [
    { slot: 0, variation: "flatlay", seed: SEEDS[0], prompt: flatlay, base: "upload", brandAsset: "flatlay" },
    { slot: 1, variation: "hand", seed: SEEDS[1], prompt: hand, base: "design" },
    { slot: 2, variation: "package", seed: SEEDS[2], prompt: pkg, base: "design", brandAsset: "package" },
  ];
}
