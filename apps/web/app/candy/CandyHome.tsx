import Image from "next/image";
import Link from "next/link";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { COLLECTION_BY_HANDLE_QUERY } from "@/lib/shopify/queries";
import type { CollectionByHandleQueryResult, ShopifyProduct } from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { NewsletterForm } from "@/app/components/NewsletterForm";
import { HeroSlider } from "./HeroSlider";

/* ---------- types & data ---------- */

type Flavor = {
  name: string;
  shape: string;
  finish: string;
  price: string;
  image: string;
  href: string;
  swatches: string[];
  sticker?: { label: string; tone: "" | "is-mint" | "is-soda" | "is-gum" };
};

const FALLBACK: Flavor[] = [
  { name: "Bubblegum Pop", shape: "Almond", finish: "Gloss", price: "$18", image: "/images/listing/pink and silver press on nails.avif", href: "/shop", swatches: ["#9FED40", "#60779F"], sticker: { label: "New flavor", tone: "is-gum" } },
  { name: "Cotton Candy", shape: "Oval", finish: "Sheer", price: "$16", image: "/images/listing/pale pinkish and silver press on nails.avif", href: "/shop", swatches: ["#E6D5EB", "#9B7BB0"] },
  { name: "Cherry Cola", shape: "Almond", finish: "Gloss", price: "$20", image: "/images/listing/cat eye gel red press on nails.avif", href: "/shop", swatches: ["#60779F", "#271028"], sticker: { label: "Fan fave", tone: "" } },
  { name: "Soda Pop", shape: "Short Square", finish: "Chrome", price: "$22", image: "/images/listing/silver press on nails.avif", href: "/shop", swatches: ["#60779F", "#C9B6D2"], sticker: { label: "New flavor", tone: "is-soda" } },
  { name: "Lemon Drop", shape: "Oval", finish: "Gloss", price: "$18", image: "/images/listing/amber and gold press on nails.avif", href: "/shop", swatches: ["#9FED40", "#6FBF1F"], sticker: { label: "Almost gone", tone: "is-mint" } },
  { name: "Midnight Licorice", shape: "Short Square", finish: "Matte", price: "$19", image: "/images/listing/cat eye black press on nails.avif", href: "/shop", swatches: ["#271028", "#60779F"] },
  { name: "Autumn Caramel", shape: "Almond", finish: "Gloss", price: "$18", image: "/images/listing/autumn retro press on nails.avif", href: "/shop", swatches: ["#6FBF1F", "#9FED40"] },
  { name: "Tuxedo Mint", shape: "Square", finish: "Gloss", price: "$17", image: "/images/listing/black and white press on nails.avif", href: "/shop", swatches: ["#271028", "#9FED40"] },
];

const SWATCH_CYCLE = ["#9FED40", "#60779F", "#271028", "#C9B6D2", "#6FBF1F"];

function money(p: ShopifyProduct): string {
  const m = p.priceRange.minVariantPrice;
  const n = Number(m.amount);
  return Number.isFinite(n) ? `$${n.toFixed(n % 1 === 0 ? 0 : 2)}` : m.amount;
}

function toFlavor(p: ShopifyProduct, i: number): Flavor {
  return {
    name: p.title,
    shape: p.productType || "Almond",
    finish: p.tags[0] ?? "Gloss",
    price: money(p),
    image: p.featuredImage?.url ?? FALLBACK[i % FALLBACK.length].image,
    href: `/product/${p.handle}`,
    swatches: [SWATCH_CYCLE[i % SWATCH_CYCLE.length], SWATCH_CYCLE[(i + 2) % SWATCH_CYCLE.length]],
  };
}

// Pull a curated collection's products (best-sellers / new-drops) so the
// homepage shelves track Shopify merchandising. Falls back to the static
// flavor list when the collection is empty or unreachable.
async function getCollectionFlavors(
  handle: string,
  limit: number,
  sticker?: Flavor["sticker"],
): Promise<Flavor[]> {
  let flavors: Flavor[] = [];
  try {
    const data = await storefrontFetch<CollectionByHandleQueryResult>(
      COLLECTION_BY_HANDLE_QUERY,
      { handle, first: limit },
    );
    flavors = (data.collection?.products.nodes ?? []).map(toFlavor);
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error(`[candy] collection ${handle} fetch failed:`, err);
    }
  }
  if (!flavors.length) flavors = FALLBACK.slice(0, limit).map((f) => ({ ...f, sticker: undefined }));
  return flavors
    .slice(0, limit)
    .map((f, i) => (i === 0 && sticker ? { ...f, sticker } : { ...f, sticker: undefined }));
}

/* ---------- small pieces ---------- */

function src(path: string): string {
  return path.startsWith("http") ? path : encodeURI(path);
}

function FlavorCard({ f, eager = false }: { f: Flavor; eager?: boolean }) {
  return (
    <Link href={f.href} className="candy-card" aria-label={`${f.name} — ${f.price}`}>
      {f.sticker && (
        <span className={`candy-sticker ${f.sticker.tone}`} style={{ position: "absolute", top: -10, left: 16, zIndex: 2 }}>
          {f.sticker.label}
        </span>
      )}
      <div className="candy-card-img">
        <Image
          src={src(f.image)}
          alt={`${f.name} press-on nail set`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          priority={eager}
        />
      </div>
      <div style={{ padding: "16px 6px 6px" }}>
        <div className="candy-cardhead">
          <div className="candy-cardhead-text">
            <h3 className="candy-cardtitle">{f.name}</h3>
          </div>
          <span className="candy-cardprice">{f.price}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <span style={{ display: "inline-flex", gap: 6 }}>
            {f.swatches.map((c, i) => (
              <span key={i} className="candy-swatch" style={{ background: c }} />
            ))}
          </span>
          <span className="candy-quickadd" aria-hidden>+</span>
        </div>
      </div>
    </Link>
  );
}

const STEPS = [
  { n: "1", t: "Match", d: "Use Find My Size for a perfect fit in 30 seconds. No salon, no guesswork.", emoji: "📏" },
  { n: "2", t: "Press", d: "Peel, press, hold for ten seconds. A full set on in minutes, anywhere.", emoji: "💅" },
  { n: "3", t: "Show off", d: "Wear them all week. When you're done, they pop off clean — no damage.", emoji: "✨" },
];

const REVIEWS = [
  { q: "First time ever wearing press-ons and they stayed on a whole week. So fun!", n: "Riley P.", s: "Bubblegum Pop" },
  { q: "Looks way more expensive than it is. Got compliments all day.", n: "Devon M.", s: "Soda Pop" },
  { q: "The removal is actually easy?? Obsessed. Already reordering.", n: "Sam K.", s: "Cherry Cola" },
];

/* ---------- page ---------- */

export default async function CandyHome() {
  const [fanFavorites, newFlavors] = await Promise.all([
    getCollectionFlavors("best-sellers", 8, { label: "Fan fave", tone: "" }),
    getCollectionFlavors("new-drops", 10, { label: "New flavor", tone: "is-gum" }),
  ]);

  return (
    <>
      <AnnouncementTicker />
      <Header />

      {/* ---- hero carousel (candy intro + Wairo 和色 series) ---- */}
      <HeroSlider />

      {/* ---- flavor ticker ---- */}
      <div className="candy-marquee" style={{ background: "var(--grape)", borderBlock: "2.5px solid var(--ink)", padding: "12px 0" }}>
        <div className="candy-marquee-track" style={{ animationDuration: "32s" }}>
          {[0, 1].map((k) => (
            <span key={k} style={{ paddingRight: 0, fontSize: 22, color: "#fff" }}>
              Bubblegum Pop&nbsp;·&nbsp;Mint Chip&nbsp;·&nbsp;Cotton Candy&nbsp;·&nbsp;Soda Pop&nbsp;·&nbsp;Lemon Drop&nbsp;·&nbsp;Grape Soda&nbsp;·&nbsp;Cherry Cola&nbsp;·&nbsp;Sugar Gloss&nbsp;·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ---- fan favorites (grid) — wired to the Best Sellers collection ---- */}
      <section className="candy-sec">
        <div className="candy-wrap">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 36 }}>
            <div>
              <span className="candy-eyebrow">Crowd pleasers</span>
              <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10 }}>Fan favorites</h2>
            </div>
            <Link href="/collections/best-sellers" className="candy-btn is-ghost" style={{ padding: "12px 22px", fontSize: 15 }}>See all</Link>
          </div>
          <div className="candy-grid">
            {fanFavorites.map((f, i) => (
              <FlavorCard key={f.name + i} f={f} eager={i < 4} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- 3 steps ---- */}
      <section className="candy-sec" style={{ background: "var(--marshmallow)", borderTop: "2.5px solid var(--ink)" }}>
        <div className="candy-wrap">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="candy-eyebrow" style={{ justifyContent: "center" }}>So easy it&apos;s silly</span>
            <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10 }}>Press on in 3 steps</h2>
          </div>
          <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {STEPS.map((s) => (
              <div key={s.n} className="candy-step">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="num">{s.n}</span>
                  <span style={{ fontSize: 38 }} aria-hidden>{s.emoji}</span>
                </div>
                <h3 style={{ fontSize: 26, marginTop: 20 }}>{s.t}</h3>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-soft)", marginTop: 8 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- new flavors (scroll-snap slider) — wired to the New Drops collection ---- */}
      <section className="candy-sec" style={{ background: "var(--soda)", borderTop: "2.5px solid var(--ink)" }}>
        <div className="candy-wrap">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 30 }}>
            <div>
              <span className="candy-eyebrow">Fresh batch</span>
              <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10 }}>New flavors</h2>
            </div>
            <Link href="/collections/new-drops" className="candy-btn is-ghost" style={{ padding: "12px 22px", fontSize: 15 }}>See all</Link>
          </div>
        </div>
        <div className="candy-rack">
          {newFlavors.map((f, i) => (
            <div key={f.name + i} className="candy-rack-item">
              <FlavorCard f={f} />
            </div>
          ))}
        </div>
      </section>

      {/* ---- social proof ---- */}
      <section className="candy-sec">
        <div className="candy-wrap">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="candy-eyebrow" style={{ justifyContent: "center" }}>Everyone&apos;s wearing them</span>
            <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10 }}>Loved out loud</h2>
          </div>
          <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {REVIEWS.map((r) => (
              <figure key={r.n} className="candy-review">
                <span className="candy-stars" aria-label="5 out of 5 stars">★★★★★</span>
                <blockquote style={{ fontSize: 18, fontWeight: 700, margin: "14px 0 16px", lineHeight: 1.45 }}>
                  “{r.q}”
                </blockquote>
                <figcaption style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)" }}>
                  {r.n} · <span style={{ color: "var(--bubblegum-d)" }}>{r.s}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---- find my size band ---- */}
      <section className="candy-sec" style={{ background: "var(--lemon)", borderBlock: "2.5px solid var(--ink)" }}>
        <div className="candy-wrap" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(34px, 6vw, 64px)" }}>Not sure of your size?</h2>
          <p style={{ fontSize: 19, fontWeight: 700, color: "var(--ink)", maxWidth: 520, margin: "16px auto 0" }}>
            Our 30-second fit finder gets you the right set the first time. No measuring tape required.
          </p>
          <Link href="/fit" className="candy-btn" style={{ marginTop: 28 }}>Find My Size <span className="pop" aria-hidden>📏</span></Link>
        </div>
      </section>

      {/* ---- newsletter ---- */}
      <section id="newsletter" className="candy-sec">
        <div className="candy-wrap" style={{ maxWidth: 640, textAlign: "center" }}>
          <span className="candy-sticker is-mint" style={{ fontSize: 14 }}>Join the candy club</span>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", marginTop: 18 }}>Get first dibs on new flavors</h2>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-soft)", marginTop: 12 }}>
            Early access, restock alerts, and the occasional very good discount. No spam, ever.
          </p>
          <NewsletterForm />
        </div>
      </section>

      <Footer />
    </>
  );
}
