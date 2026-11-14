import Image from "next/image";
import Link from "next/link";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { COLLECTION_BY_HANDLE_QUERY, NEWEST_PRODUCTS_QUERY } from "@/lib/shopify/queries";
import type {
  CollectionByHandleQueryResult,
  ProductsQueryResult,
  ShopifyProduct,
} from "@/lib/shopify/types";
import { pickNewestNailSets } from "@/lib/shopify/newest";
import { CUSTOM_PRODUCT_ID } from "@/lib/customize/product";
import { NewsletterForm } from "@/app/components/NewsletterForm";
import { FavoriteButton } from "@/app/components/FavoriteButton";
import type { FavItem } from "@/lib/favorites";
import { HeroSlider } from "./HeroSlider";
import { PromoStrip } from "@/app/components/PromoStrip";

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
  // Present only for real Shopify products (not the static fallback set) so the
  // homepage cards can be favorited.
  fav?: FavItem;
};

// Card image for a catalog product that has no featured image yet.
const PLACEHOLDER_IMAGE = "/images/listing/black and white press on nails.avif";

const SWATCH_CYCLE = ["#9FED40", "#60779F", "#271028", "#C9B6D2", "#6FBF1F"];

function money(p: ShopifyProduct): string {
  const m = p.priceRange.minVariantPrice;
  const n = Number(m.amount);
  return Number.isFinite(n) ? `$${n.toFixed(n % 1 === 0 ? 0 : 2)}` : m.amount;
}

function toFlavor(p: ShopifyProduct, i: number): Flavor {
  const variant = p.variants?.nodes[0];
  return {
    name: p.title,
    shape: p.productType || "Almond",
    finish: p.tags[0] ?? "Gloss",
    price: money(p),
    image: p.featuredImage?.url ?? PLACEHOLDER_IMAGE,
    href: `/products/${p.handle}`,
    swatches: [SWATCH_CYCLE[i % SWATCH_CYCLE.length], SWATCH_CYCLE[(i + 2) % SWATCH_CYCLE.length]],
    fav: {
      id: p.id,
      handle: p.handle,
      title: p.title,
      image: p.featuredImage?.url ?? null,
      price: p.priceRange.minVariantPrice.amount,
      currency: p.priceRange.minVariantPrice.currencyCode,
      variantId: variant?.id ?? null,
      available: variant?.availableForSale ?? false,
    },
  };
}

// Pull a curated collection's products (best-sellers / new-drops) so the
// homepage shelves track Shopify merchandising. Returns [] when the collection
// is empty or unreachable; the section then hides instead of showing fake sets.
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
  return flavors
    .slice(0, limit)
    .map((f, i) => (i === 0 && sticker ? { ...f, sticker } : { ...f, sticker: undefined }));
}

// The "New flavors" shelf reads the newest nail sets straight from the catalog
// (by created date) so it never depends on the New Drops collection being
// curated by hand. Over-fetch so filtering out gift cards / essentials / the
// Custom Nail Set still leaves a full shelf.
async function getNewestFlavors(limit: number, sticker: Flavor["sticker"]): Promise<Flavor[]> {
  let flavors: Flavor[] = [];
  try {
    const data = await storefrontFetch<ProductsQueryResult>(NEWEST_PRODUCTS_QUERY, {
      first: limit + 8,
    });
    flavors = pickNewestNailSets(data.products.nodes, limit, [CUSTOM_PRODUCT_ID]).map(toFlavor);
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[candy] newest products fetch failed:", err);
    }
  }
  return flavors.map((f, i) => (i === 0 ? { ...f, sticker } : { ...f, sticker: undefined }));
}

/* ---------- small pieces ---------- */

function src(path: string): string {
  return path.startsWith("http") ? path : encodeURI(path);
}

function FlavorCard({ f, eager = false }: { f: Flavor; eager?: boolean }) {
  return (
    <div className="candy-cardwrap">
    {f.fav && <FavoriteButton className="candy-fav-oncard" item={f.fav} />}
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
    </div>
  );
}

const STEPS = [
  { n: "1", t: "Match", d: "Use Find My Size for a perfect fit in 30 seconds. No salon, no guesswork.", emoji: "📏" },
  { n: "2", t: "Press", d: "Peel, press, hold for ten seconds. A full set on in minutes, anywhere.", emoji: "💅" },
  { n: "3", t: "Clip", d: "Trim and file to your perfect length and shape. Totally up to you.", emoji: "✂️" },
  { n: "4", t: "Show off", d: "Wear them all week. When you're done, they pop off clean — no damage.", emoji: "✨" },
];

/* ---------- page ---------- */

export default async function CandyHome() {
  const [fanFavorites, newFlavors] = await Promise.all([
    getCollectionFlavors("best-sellers", 8, { label: "Fan fave", tone: "" }),
    getNewestFlavors(10, { label: "New flavor", tone: "is-gum" }),
  ]);
  // Marquee names come from the live shelves so it never advertises a set
  // that isn't in the catalog.
  const tickerNames = [...new Set([...newFlavors, ...fanFavorites].map((f) => f.name))];

  return (
    <>

      {/* ---- hero carousel (candy intro + Wairo 和色 series) ---- */}
      <HeroSlider />

      {/* ---- flavor ticker ---- */}
      {tickerNames.length > 0 && (
      <div className="candy-marquee" style={{ background: "var(--grape)", padding: "12px 0" }}>
        <div className="candy-marquee-track" style={{ animationDuration: "32s" }}>
          {[0, 1].map((k) => (
            <span key={k} style={{ paddingRight: 0, fontSize: 22, color: "#fff" }}>
              {tickerNames.map((n) => `${n} · `).join("")}
            </span>
          ))}
        </div>
      </div>
      )}

      {/* ---- seasonal band: 3-for-$45 + US Christmas cutoff (lib/promo/holiday.ts) ---- */}
      <div className="candy-wrap">
        <PromoStrip style={{ marginTop: 28 }} />
      </div>

      {/* ---- fan favorites (grid) — wired to the Best Sellers collection ---- */}
      {fanFavorites.length > 0 && (
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
      )}

      {/* ---- 3 steps ---- */}
      <section className="candy-sec" style={{ background: "var(--marshmallow)" }}>
        <div className="candy-wrap">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="candy-eyebrow" style={{ justifyContent: "center" }}>So easy it&apos;s silly</span>
            <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", marginTop: 10 }}>Press on in 4 steps</h2>
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

      {/* ---- new flavors (scroll-snap slider) — newest nail sets by created date ---- */}
      {newFlavors.length > 0 && (
      <section className="candy-sec" style={{ background: "var(--soda)" }}>
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
      )}

      {/* ---- find my size band ---- */}
      <section className="candy-sec" style={{ background: "var(--lemon)" }}>
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

    </>
  );
}
