import type { ShopifyProduct } from "@/lib/shopify/types";

export type EditKey = "stealth" | "architectural" | "high-signal";

type EditMeta = {
  num: string;
  signal: string;
  signalRight: string;
  for: string;
  title: React.ReactNode;
  desc: string;
  cta: string;
  ctaHref: string;
  ctaClass?: string;
  tags: string[];
  borderColor?: string;
  pill?: string;
};

const meta: Record<EditKey, EditMeta> = {
  stealth: {
    num: "N°01 · Stealth",
    signal: "N°01 · Stealth",
    signalRight: "Low Signal",
    for: "For: Office · Daily · First time",
    title: "The Stealth Edit",
    desc: "Low signal. High intention. Quiet nudes, soft greys, and subtle metallics made for office, daily wear, and first-time buyers.",
    cta: "Shop The Stealth Edit →",
    ctaHref: "/collections/minimalist-matte",
    tags: ["Solid", "Nude", "Daily"],
  },
  architectural: {
    num: "N°02 · Architectural",
    signal: "N°02 · Architectural",
    signalRight: "Editor's Pick",
    for: "For: Dates · Galleries · Creative work",
    title: (
      <>
        The Architectural <span className="italic font-serif font-light text-akane">Edit</span>
      </>
    ),
    desc: "Clean lines. Dark contrast. Controlled edge. Black-and-white architecture and red-edged business finishes for men who want style without noise.",
    cta: "Shop The Architectural Edit →",
    ctaHref: "/collections/geometric-grit",
    ctaClass: "text-akane",
    tags: ["Monochrome", "Contrast", "Business"],
    borderColor: "border-akane",
    pill: "Featured · Editor's pick",
  },
  "high-signal": {
    num: "N°03 · High-Signal",
    signal: "N°03 · High-Signal",
    signalRight: "Statement",
    for: "For: Nightlife · Events · Statement",
    title: "The High-Signal Edit",
    desc: "For nights that need a sharper finish. Chrome, liquid metal, and graphic contrast built for nightlife, parties, and statement outfits.",
    cta: "Shop The High-Signal Edit →",
    ctaHref: "/collections/night-out-bold",
    tags: ["Chrome", "Gloss", "Graphic"],
  },
};

export type EditGroup = { key: EditKey; products: ShopifyProduct[] };

export function Edits({ groups = [] }: { groups?: EditGroup[] }) {
  const present = groups.filter((g) => g.products.length > 0);
  if (present.length === 0) return null;

  return (
    <section id="edits" className="bg-toriko sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">N°04</span>
              <span className="cap">Choose Your Edit</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              Choose
              <br />
              your <span className="italic font-serif font-light">edit</span>
              <span className="text-akane">.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 flex flex-col justify-end">
            <p className="text-rikyu text-[17px] max-w-[420px]">Start quiet. Go louder when you&apos;re ready.</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {present.map((g, i) => (
                <span
                  key={g.key}
                  className={`edit-pill ${i === 1 ? "edit-pill-active" : ""}`}
                >
                  {meta[g.key].signal.replace(/^N°0\d · /, `0${i + 1} · `)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {present.map((g, idx) => {
            const e = meta[g.key];
            const hero = g.products[0];
            const thumbs = g.products.slice(0, 4);
            return (
              <article key={g.key} className="col-span-12 md:col-span-4 edit-card group relative">
                {e.pill && (
                  <span className="absolute -top-4 left-0 z-20 tape">{e.pill}</span>
                )}
                <div
                  className={`relative aspect-[4/5] overflow-hidden bg-shiracha border ${
                    e.borderColor ?? "border-hair"
                  }`}
                >
                  {hero.featuredImage && (
                    <img
                      src={hero.featuredImage.url}
                      alt={hero.featuredImage.altText ?? `${hero.title} press-on nails`}
                      className="img-cover edit-image"
                    />
                  )}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="cap">{e.signal}</span>
                    <span className={`cap ${idx === 1 ? "text-akane" : ""}`}>{e.signalRight}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-paper via-[rgba(245,245,245,0.85)] to-transparent">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-rikyu font-mono">{e.for}</span>
                  </div>
                </div>
                <div className="pt-6">
                  <h3 className="font-display text-[32px] md:text-[36px] leading-[0.95] tracking-display">{e.title}</h3>
                  <p className="mt-3 text-[14px] text-rikyu max-w-[340px]">{e.desc}</p>
                  <div className="mt-6 flex items-center gap-4">
                    <a href={e.ctaHref} className={`ulink text-[12px] tracking-[0.18em] uppercase font-medium ${e.ctaClass ?? ""}`}>
                      {e.cta}
                    </a>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono text-rikyu">
                    {e.tags.map((t) => (
                      <span key={t} className="px-2 py-1 border border-hair">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 pt-5 border-t border-hair">
                    <span className="cap mb-3 block">In this edit</span>
                    <div className="grid grid-cols-4 gap-2">
                      {thumbs.map((p, i) => (
                        <a
                          key={p.id}
                          href={`/product/${p.handle}`}
                          className={`aspect-square overflow-hidden border block bg-shiracha ${
                            i === 0 && idx === 1 ? "border-akane" : "border-hair"
                          }`}
                          title={p.title}
                        >
                          {p.featuredImage && (
                            <img
                              src={p.featuredImage.url}
                              alt={p.featuredImage.altText ?? `${p.title} press-on set`}
                              className="img-cover"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
