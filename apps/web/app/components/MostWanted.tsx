import Link from "next/link";
import type { ShopifyProduct } from "@/lib/shopify/types";

type Item = {
  badge: { label: string; tone: "akane" | "konnezumi" | "paper-tetsu" };
  src: string;
  alt: string;
  title: string;
  meta: string;
  price: string;
  href: string;
};

const badgeTones: Item["badge"]["tone"][] = ["akane", "konnezumi", "paper-tetsu", "akane"];
const badgeLabels = ["New", "Low stock", "Editor pick", "Restocked"];

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
      badge: { label: badgeLabels[i] ?? "Featured", tone: badgeTones[i] ?? "akane" },
      src: p.featuredImage?.url ?? "/images/listing/black and white press on nails.avif",
      alt: p.featuredImage?.altText ?? p.title,
      title: p.title,
      meta,
      price: formatPrice(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode),
      href: `/product/${p.handle}`,
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
    <section id="new-arrivals" className="bg-paper sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 mb-10 md:mb-14 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">New arrivals</span>
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
            <article key={it.title} className="col-span-6 md:col-span-3 group edit-card border border-hair bg-toriko flex flex-col">
              <div className="relative aspect-square overflow-hidden bg-shiracha">
                <img src={it.src} alt={it.alt} className="img-cover edit-image" />
                <span className={badgeClass(it.badge.tone)}>{it.badge.label}</span>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-display text-[18px] leading-[1.1]">{it.title}</h3>
                <p className="mt-1 text-[12px] text-rikyu">{it.meta}</p>
                <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                  <span className="font-display text-[16px] text-tetsu">{it.price}</span>
                  <a href={it.href} className="ulink text-[10px] tracking-[0.18em] uppercase font-medium text-rikyu">
                    View →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
          <span className="cap">Fresh sets, restocked weekly</span>
          <Link href="/shop" className="btn-ghost">
            Shop All Sets <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
