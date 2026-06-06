// Per-product FAQ — visible accordion + FAQPage JSON-LD.
// Answers are built from facts true of every Nailismo set (box contents,
// wear time, application, sizing tool), personalized with the product title
// so each PDP carries unique, accurate, answer-engine-harvestable text.
// No review/rating data is invented here.

type Props = {
  title: string;
  productType?: string | null;
};

// Catalog titles carry decorative emoji (e.g. "mono mode 🌀"). Strip them from
// FAQ copy + schema so questions read cleanly; the PDP <h1> keeps the emoji.
function cleanTitle(raw: string): string {
  return raw
    .replace(/[\p{Extended_Pictographic}‍️⃣]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildItems(rawTitle: string, productType?: string | null) {
  const title = cleanTitle(rawTitle);
  const kind = productType?.trim() || "press-on set";
  return [
    {
      q: `How long do the ${title} press-ons last?`,
      a: `With the liquid adhesive included in the box, ${title} can last up to 7 days, depending on prep and daily activity. The temporary tabs are best for one-night wear, events, or a first-time test run.`,
    },
    {
      q: `What comes in the ${title} box?`,
      a: `Every ${title} set ships with 10 premium press-on nails plus the full toolkit — a sizing range, application tabs, and liquid adhesive — so you can apply at home with no salon visit.`,
    },
    {
      q: `How do I find my size for ${title}?`,
      a: `Each ${title} set includes a sizing range. Match every nail to your own before applying. Our Find My Size tool maps your exact fit in about a minute.`,
    },
    {
      q: `How do I apply and remove ${title}?`,
      a: `Peel, press, and hold for about ten seconds per nail — a full ${title} set goes on in minutes. To remove, soak and loosen gently; never force them off, since most damage comes from forced removal, not normal wear.`,
    },
    {
      q: `Will the ${title} ${kind} look natural?`,
      a: `Yes. ${title} uses salon-grade gel with clean edges and shapes that sit naturally on the hand, so the set reads like a real manicure rather than a costume.`,
    },
  ];
}

export function ProductFaq({ title, productType }: Props) {
  const items = buildItems(title, productType);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section style={{ marginTop: 56 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <span className="candy-eyebrow">Common questions</span>
      <h2 style={{ fontSize: "clamp(28px,4vw,48px)", marginTop: 10, marginBottom: 24 }}>
        Good to know
      </h2>
      <div style={{ maxWidth: 760 }}>
        {items.map((it, i) => (
          <details key={i} className="candy-accordion">
            <summary>
              <span>{it.q}</span>
              <span className="acc-plus" aria-hidden>+</span>
            </summary>
            <div className="acc-body">{it.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
