import Link from "next/link";
import type { ShopifyProduct } from "@/lib/shopify/types";

type Editorial = {
  desc: string;
  topLeft: { label: string; tone: "tape" | "office" | "low" };
  topRight: { label: string; tone: "arch" | "stealth-light" };
};

const editorial: Record<string, Editorial> = {
  "monochrome-edge": {
    desc: "Black-and-white architectural set. Clean enough for the office, sharp enough for the bar.",
    topLeft: { label: "Editor's Pick", tone: "tape" },
    topRight: { label: "Architectural", tone: "arch" },
  },
  "galaxy-glitch": {
    desc: "Cat-eye black with subtle depth. Reads like a watch detail — present but quiet.",
    topLeft: { label: "New Arrival", tone: "office" },
    topRight: { label: "Stealth", tone: "stealth-light" },
  },
  "crimson-authority": {
    desc: "Black base with a controlled red edge. Sharp without crossing into noise.",
    topLeft: { label: "Low Signal", tone: "low" },
    topRight: { label: "Stealth", tone: "stealth-light" },
  },
};

export const STARTER_HANDLES = ["monochrome-edge", "galaxy-glitch", "crimson-authority"] as const;

function topLeftClass(tone: Editorial["topLeft"]["tone"]) {
  if (tone === "tape") return "absolute top-3 left-3 cap text-paper bg-tetsu px-2 py-1";
  if (tone === "office") return "absolute top-3 left-3 cap text-paper bg-tetsu px-2 py-1";
  return "absolute top-3 left-3 cap text-paper bg-konnezumi px-2 py-1";
}

function topRightClass() {
  return "absolute top-3 right-3 cap text-tetsu bg-[rgba(245,245,245,0.85)] px-2 py-1";
}

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

export function StarterGateway({ products = [] }: { products?: ShopifyProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section id="starter-gateway" className="bg-paper sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 mb-10 md:mb-14 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">Best for first sets</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(36px,5vw,72px)]">
              Built to start.
              <br />
              Built to <span className="italic font-serif font-light">wear</span>
              <span className="text-akane">.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-rikyu max-w-[440px]">
              {products.length} sets engineered for first-time wear. Familiar shapes, masculine finishes, full sizing range. Pick a signal level and start there.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="edit-pill">Starter Friendly</span>
              <span className="edit-pill">S–XL Fit</span>
              <span className="edit-pill">Tabs + Liquid</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5 lg:gap-6">
          {products.map((p) => {
            const ed = editorial[p.handle] ?? {
              desc: "Press-on set engineered for men's hands.",
              topLeft: { label: "Featured", tone: "office" },
              topRight: { label: "Press-On", tone: "stealth-light" },
            };
            const price = formatPrice(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode);
            return (
              <article
                key={p.id}
                className="col-span-12 md:col-span-4 group relative border border-hair bg-paper flex flex-col"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-shiracha">
                  {p.featuredImage && (
                    <img src={p.featuredImage.url} alt={p.featuredImage.altText ?? p.title} className="img-cover edit-image" />
                  )}
                  <span className={topLeftClass(ed.topLeft.tone)}>{ed.topLeft.label}</span>
                  <span className={topRightClass()}>{ed.topRight.label}</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-[20px] md:text-[22px] leading-[1.05]">{p.title}</h3>
                    <span className="font-display text-[18px] whitespace-nowrap">{price}</span>
                  </div>
                  <p className="text-[13px] text-rikyu mt-2">{ed.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-rikyu">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="px-2 py-1 border border-hair">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 pt-5 border-t border-hair flex items-center justify-between gap-3">
                    <Link href={`/product/${p.handle}`} className="ulink text-[11px] tracking-[0.18em] uppercase font-medium">
                      View Details →
                    </Link>
                    <Link
                      href={`/product/${p.handle}`}
                      className="bg-tetsu text-paper px-4 py-2 text-[11px] tracking-[0.18em] uppercase font-medium hover:bg-akane transition-colors"
                    >
                      Quick Add
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
          <span className="cap">Free shipping over $60 · S–XL fit · No salon</span>
          <Link href="/shop" className="btn-ghost">
            Shop All Sets <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
