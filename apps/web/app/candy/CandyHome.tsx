import Image from "next/image";
import Link from "next/link";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { PRODUCTS_QUERY } from "@/lib/shopify/queries";
import type { ProductsQueryResult, ShopifyProduct } from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { NewsletterForm } from "@/app/components/NewsletterForm";
import { HeroVideoTile } from "./HeroVideoTile";

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
    sticker: i === 0 ? { label: "New flavor", tone: "is-gum" } : undefined,
  };
}

async function getFlavors(): Promise<Flavor[]> {
  try {
    const data = await storefrontFetch<ProductsQueryResult>(PRODUCTS_QUERY, { first: 8 });
    const nodes = data.products.nodes;
    if (nodes.length) return nodes.map(toFlavor);
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[candy] products fetch failed:", err);
    }
  }
  return FALLBACK;
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 20 }}>{f.name}</h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 700, marginTop: 2 }}>
              {f.shape} · {f.finish}
            </p>
          </div>
          <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 19 }}>{f.price}</span>
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

// Each mood maps to a real vibe-based collection so the dot color reads the
// product energy, not a literal paint chip.
const MOODS = [
  { name: "Stealth", c: "#271028", href: "/collections/the-stealth-edit" },
  { name: "Chrome", c: "#C5CAD3", href: "/collections/chrome-club" },
  { name: "Loud", c: "#9FED40", href: "/collections/loud-and-graphic" },
  { name: "Cozy", c: "#C9A27A", href: "/collections/latte-and-neutrals" },
  { name: "Sharp", c: "#60779F", href: "/collections/the-architectural-edit" },
  { name: "After Dark", c: "#9B7BB0", href: "/collections/night-out-bold" },
];

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
  const flavors = await getFlavors();
  const newFlavors = flavors.slice(0, 8);
  const bestSellers = [...flavors].slice(0, 6);

  return (
    <>
      <AnnouncementTicker />
      <Header />

      {/* ---- hero ---- */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="candy-blob" style={{ width: 360, height: 360, background: "var(--bubblegum)", top: -80, left: -60 }} />
        <div className="candy-blob" style={{ width: 300, height: 300, background: "var(--soda)", top: 120, right: -40, animationDelay: "-4s" }} />
        <div className="candy-blob" style={{ width: 240, height: 240, background: "var(--lemon)", bottom: -60, left: "38%", animationDelay: "-7s" }} />

        <div className="candy-wrap" style={{ position: "relative", zIndex: 2, paddingBlock: "clamp(48px, 7vw, 96px)" }}>
          <div style={{ display: "grid", gap: 40, gridTemplateColumns: "1fr", alignItems: "center" }} className="candy-hero-grid">
            <div className="candy-rise">
              <span className="candy-eyebrow">Press-on nails · for every hand</span>
              <h1 style={{ fontSize: "clamp(52px, 9vw, 104px)", marginTop: 18 }}>
                Press on.<br />
                <span style={{ color: "var(--bubblegum-d)" }}>Show</span>{" "}
                <span style={{ color: "var(--grape)" }}>off.</span>
              </h1>
              <p style={{ fontSize: "clamp(17px, 2.2vw, 21px)", fontWeight: 700, color: "var(--ink-soft)", maxWidth: 460, marginTop: 18 }}>
                Bright, collectible nail sets ready in minutes. Easy to wear, easy to remove, impossible to resist.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
                <Link href="/shop" className="candy-btn">Shop the Candy Rack <span className="pop" aria-hidden>🍬</span></Link>
                <Link href="/fit" className="candy-btn is-ghost">Find My Size</Link>
              </div>
            </div>

            <div style={{ position: "relative", minHeight: 420 }} className="candy-hero-art">
              {/* supporting product flat-lay */}
              <div className="candy-float d1" style={{ ["--rot" as string]: "-9deg", position: "absolute", bottom: -6, left: "30%", width: "34%", maxWidth: 150, zIndex: 1 }}>
                <HeroTile img="/images/listing/pink and silver press on nails.avif" alt="Bubblegum Pop set" border="var(--bubblegum)" />
              </div>
              {/* second face */}
              <div className="candy-float d3" style={{ ["--rot" as string]: "6deg", position: "absolute", top: 0, right: "-1%", width: "46%", maxWidth: 218, zIndex: 2 }}>
                <HeroTile img="/images/website/hero-festive-nails-model.avif" alt="Model showing off Nailismo press-on nails with festive art" border="var(--lemon)" />
              </div>
              {/* anchor face: looping video of a real hand wearing the nails */}
              <div className="candy-float d2" style={{ ["--rot" as string]: "-4deg", position: "absolute", top: 44, left: "1%", width: "52%", maxWidth: 256, zIndex: 3 }}>
                <HeroVideoTile
                  src="/videos/hero-cloud-nails.mp4"
                  poster="/videos/hero-cloud-nails-poster.avif"
                  alt="Model wearing Nailismo press-on nails with sky-blue cloud art"
                  border="var(--soda)"
                />
              </div>
              <span className="candy-sticker is-gum candy-float" style={{ position: "absolute", top: 6, left: "26%", zIndex: 5, fontSize: 14 }}>
                Ready in minutes!
              </span>
            </div>
          </div>
        </div>
      </section>

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

      {/* ---- new flavors ---- */}
      <section className="candy-sec">
        <div className="candy-wrap">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 36 }}>
            <div>
              <span className="candy-eyebrow">Fresh batch</span>
              <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10 }}>New flavors</h2>
            </div>
            <Link href="/shop" className="candy-btn is-ghost" style={{ padding: "12px 22px", fontSize: 15 }}>See all</Link>
          </div>
          <div className="candy-grid">
            {newFlavors.map((f, i) => (
              <FlavorCard key={f.name + i} f={f} eager={i < 4} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- shop by color ---- */}
      <section className="candy-sec" style={{ background: "var(--cream)", borderBlock: "2.5px solid var(--ink)" }}>
        <div className="candy-wrap" style={{ textAlign: "center" }}>
          <span className="candy-eyebrow" style={{ justifyContent: "center" }}>What&apos;s your vibe</span>
          <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10, marginBottom: 44 }}>Shop by mood</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(20px, 4vw, 48px)", justifyContent: "center" }}>
            {MOODS.map((mood) => (
              <Link key={mood.name} href={mood.href} className="candy-colorblob">
                <span className="dot" style={{ background: mood.c }} />
                <span className="lbl">{mood.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 3 steps ---- */}
      <section className="candy-sec">
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

      {/* ---- best sellers (scroll-snap rack) ---- */}
      <section className="candy-sec" style={{ background: "var(--soda)", borderTop: "2.5px solid var(--ink)" }}>
        <div className="candy-wrap">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 30 }}>
            <div>
              <span className="candy-eyebrow">Crowd pleasers</span>
              <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10 }}>Fan favorites</h2>
            </div>
          </div>
        </div>
        <div className="candy-rack">
          {bestSellers.map((f, i) => (
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

function HeroTile({ img, alt, border }: { img: string; alt: string; border: string }) {
  return (
    <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: 24, overflow: "hidden", border: `3px solid var(--ink)`, boxShadow: "var(--shadow-pop)", background: border }}>
      <Image src={src(img)} alt={alt} fill sizes="260px" style={{ objectFit: "cover" }} priority />
    </div>
  );
}
