import Link from "next/link";
import type { ShopifyProduct } from "@/lib/shopify/types";

type Item = {
  num: string;
  badge: { label: string; tone: "akane" | "konnezumi" | "paper-tetsu" };
  src: string;
  alt: string;
  title: string;
  meta: string;
  price: string;
  href: string;
  tags: string[];
};

const badgeTones: Item["badge"]["tone"][] = ["akane", "konnezumi", "paper-tetsu", "akane"];
const badgeLabels = ["Bestseller", "Low Signal", "Stealth", "High Signal"];

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

function productsToItems(products: ShopifyProduct[]): Item[] {
  return products.slice(0, 4).map((p, i) => {
    const meta = [p.productType, p.tags[0]].filter(Boolean).join(" · ") || "Press-On Set";
    return {
      num: `N°${String(i + 1).padStart(2, "0")}`,
      badge: { label: badgeLabels[i] ?? "Featured", tone: badgeTones[i] ?? "akane" },
      src: p.featuredImage?.url ?? "/images/listing/black and white press on nails.avif",
      alt: p.featuredImage?.altText ?? p.title,
      title: p.title,
      meta,
      price: formatPrice(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode),
      href: `/product/${p.handle}`,
      tags: p.tags.slice(0, 3),
    };
  });
}

function badgeClass(tone: Item["badge"]["tone"]) {
  if (tone === "akane") return "absolute top-3 right-3 cap text-paper bg-akane px-2 py-1";
  if (tone === "konnezumi") return "absolute top-3 right-3 cap text-paper bg-konnezumi px-2 py-1";
  return "absolute top-3 right-3 cap text-tetsu bg-paper px-2 py-1";
}

export function MostWanted({ products }: { products?: ShopifyProduct[] } = {}) {
  if (!products || products.length === 0) return null;
  const items = productsToItems(products);
  return (
    <section id="most-wanted" className="bg-paper sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 mb-10 md:mb-14 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">N°08</span>
              <span className="cap">Most Wanted Sets</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              Most wanted
              <br />
              <span className="italic font-serif font-light">sets</span>
              <span className="text-akane">.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-rikyu max-w-[420px]">
              Ranked by what men actually pick first. Quick add, full sizing range included, no scroll required.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {items.map((it) => (
            <article key={`${it.num}-${it.title}`} className="col-span-6 md:col-span-3 group border border-hair bg-paper flex flex-col">
              <div className="relative aspect-square overflow-hidden bg-shiracha">
                <img src={it.src} alt={it.alt} className="img-cover edit-image" />
                <span className="absolute top-3 left-3 cap text-paper bg-tetsu px-2 py-1">{it.num}</span>
                <span className={badgeClass(it.badge.tone)}>{it.badge.label}</span>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-display text-[18px] leading-[1.1]">{it.title}</h3>
                <div className="mt-1 flex items-center justify-between text-[12px] text-rikyu">
                  <span>{it.meta}</span>
                  <span className="font-display text-[16px] text-tetsu">{it.price}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.16em] font-mono text-rikyu">
                  {it.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 border border-hair">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                  <a href={it.href} className="ulink text-[10px] tracking-[0.18em] uppercase font-medium">
                    Details →
                  </a>
                  <button
                    type="button"
                    className="bg-tetsu text-paper px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase font-medium hover:bg-akane transition-colors"
                  >
                    Quick Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
          <span className="cap">Ranked by sell-through · refreshed weekly</span>
          <Link href="/shop" className="btn-ghost">
            Shop All Sets <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
