//
// Structured-data registry for the evergreen guides. Prose for each guide lives
// in Shopify (rendered by /journal/[handle]); the HowTo steps + FAQ below drive
// the HowTo/FAQPage JSON-LD for AI answer engines.
//
// COUPLING: this data is authored in tandem with the Shopify article body. If a
// guide's steps or FAQ change in Shopify, update the matching entry here too —
// the schema does NOT read from Shopify.

export type HowToStep = { name: string; text: string };
export type FaqItem = { q: string; a: string };
export type GuideSchemaData = { howToSteps?: HowToStep[]; faq: FaqItem[] };

export const GUIDE_SCHEMA: Record<string, GuideSchemaData> = {
  "how-to-apply-press-on-nails": {
    howToSteps: [
      { name: "Prep your nails", text: "Wash your hands, push back the cuticles, and lightly buff the nail surface. Wipe each nail with an alcohol pad so the adhesive grips." },
      { name: "Size every nail first", text: "Match a press-on to each nail before you stick anything. Pick the size that covers the nail bed sidewall to sidewall without pressing into the skin." },
      { name: "Apply the adhesive", text: "For up to 7 days, use the liquid glue: a thin layer on your nail and a dot on the press-on. For a single night, use a sizing tab instead." },
      { name: "Press and hold", text: "Line the press-on up at your cuticle, press down from base to tip, and hold firm for 10 seconds to push out air bubbles." },
      { name: "Set and shape", text: "Wait 10 minutes before anything wet, then file the tips to your length. Done." },
    ],
    faq: [
      { q: "How long do press-ons last with glue?", a: "With liquid adhesive and clean prep, up to 7 days. Tabs are best for one-night wear." },
      { q: "Can I shower with press-ons on?", a: "Yes, once the glue has set for about 10 minutes. Avoid long hot soaks, which loosen adhesive faster." },
      { q: "Why do my press-ons pop off early?", a: "Almost always skipped prep — oily nails or no buffing. Wipe with alcohol and buff first." },
    ],
  },
  "press-on-nail-sizing-guide": {
    howToSteps: [
      { name: "Match each nail", text: "Lay each press-on against the matching nail and find the one that spans your nail edge to edge without digging into the skin." },
      { name: "Size up when between", text: "If you're between two sizes, go larger. A slightly big press-on can be filed down; a small one lifts at the edges." },
      { name: "Record your size map", text: "Write down the size per finger. Hands are rarely one uniform size, and your map stays the same across every set." },
      { name: "Or use the fit tool", text: "Use the Find My Size tool to map your exact fit in about a minute if you'd rather not eyeball it." },
    ],
    faq: [
      { q: "How do I measure press-on nail size?", a: "Match each press-on to the nail and pick the one covering edge to edge, or use our Find My Size tool." },
      { q: "What if I'm between sizes?", a: "Size up. Filing a large nail down is easy; a small one peels at the edges." },
      { q: "Are both hands the same size?", a: "Usually no. Size each finger individually and save your map." },
    ],
  },
  "how-to-remove-press-on-nails": {
    howToSteps: [
      { name: "Soak first", text: "Soak fingertips in warm soapy water for 10–15 minutes, or wrap each nail in an acetone-soaked cotton pad for a few minutes." },
      { name: "Loosen the edge", text: "Gently wiggle a wooden cuticle stick under the edge. If it resists, soak longer — never pry hard." },
      { name: "Lift slowly", text: "Lift each press-on off slowly from the side, not straight up." },
      { name: "Rehydrate", text: "Buff away leftover glue, wash your hands, and apply cuticle oil to rehydrate the nail." },
    ],
    faq: [
      { q: "How do I remove press-ons without damaging my nails?", a: "Soak in warm water or acetone first, then lift gently from the side. Forcing them off is what causes damage." },
      { q: "Can I reuse press-ons after removing them?", a: "Often yes, if you remove gently and clean the glue off the back. Tabs make reuse easiest." },
      { q: "How do I get glue residue off?", a: "Buff lightly or soak in acetone, then oil the nail." },
    ],
  },
  "press-ons-vs-gel-vs-acrylic": {
    // Comparison guide — no procedural steps, FAQ only.
    faq: [
      { q: "Are press-ons better than gel or acrylic?", a: "For cost, speed, and zero nail damage, yes. Gel and acrylic last longer but need a salon and file down your natural nail." },
      { q: "Do press-ons damage your nails like acrylic?", a: "No. There's no drilling or hard filing — they lift off after a soak." },
      { q: "How long do press-ons last vs acrylic?", a: "Press-ons last up to 7 days; acrylic 2–3 weeks. Press-ons trade longevity for no damage and no salon visit." },
      { q: "Are press-ons cheaper than a salon?", a: "Far cheaper — one reusable set versus a recurring salon bill." },
    ],
  },
};

export function buildGuideJsonLd(
  handle: string,
  title: string,
  url: string,
  imageUrl?: string,
): object[] {
  const data = GUIDE_SCHEMA[handle];
  if (!data) return [];
  const out: object[] = [];

  if (data.howToSteps?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: title,
      ...(imageUrl ? { image: [imageUrl] } : {}),
      step: data.howToSteps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.name,
        text: s.text,
        url: `${url}#step-${i + 1}`,
      })),
    });
  }

  out.push({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });

  return out;
}
