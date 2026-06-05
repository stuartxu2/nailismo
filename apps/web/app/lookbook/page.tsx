import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { LOOKS } from "./data";

export const metadata: Metadata = {
  title: "Lookbook · Nailismo",
  description:
    "Real hands, real fits. Every Nailismo look maps to one set you can cop in a tap. Built for the fit check.",
  alternates: { canonical: "/lookbook" },
};

const HYPE = ["Real hands", "Real fits", "No gatekeeping", "On in minutes", "Lasts 7 days", "Tap to cop"];

const UGC = [
  "ugc-01", "ugc-02", "ugc-03", "ugc-04", "ugc-05",
  "ugc-06", "ugc-07", "ugc-08", "ugc-09", "ugc-10",
];

export default function LookbookIndexPage() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main
        className="candy-wrap"
        style={{ position: "relative", paddingTop: 28, paddingBottom: "clamp(64px,9vw,120px)" }}
      >
        {/* atmosphere */}
        <div className="candy-blob" aria-hidden style={{ width: 360, height: 360, background: "var(--lemon)", top: -50, left: -70 }} />
        <div className="candy-blob" aria-hidden style={{ width: 300, height: 300, background: "var(--grape)", top: 160, right: -90 }} />

        {/* breadcrumb */}
        <nav style={{ display: "flex", gap: 8, marginBottom: 22, position: "relative", zIndex: 1 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Lookbook</span>
        </nav>

        {/* HERO */}
        <section className="lb-hero candy-rise" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <span className="candy-eyebrow">The fit check</span>
            <h1 className="lb-display" style={{ marginTop: 14 }}>
              Real <span className="lb-outline">hands</span>.<br />
              Real <span className="lb-hl">fits</span>.
            </h1>
            <p style={{ marginTop: 20, fontSize: 17, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 460 }}>
              Every look = one set you can actually cop. Steal the whole vibe in a single tap —{" "}
              <strong style={{ color: "var(--ink)" }}>{LOOKS.length} looks</strong>, zero gatekeeping.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              <Link href="#looks" className="candy-btn">See the looks <span className="pop" aria-hidden>↓</span></Link>
              <Link href="/shop" className="candy-btn is-ghost">Shop all sets</Link>
            </div>
          </div>

          <div className="lb-hero-art">
            { }
            <img src="/images/lookbook/hero.avif" alt="Nailismo lookbook hero — golden-hour blue marble press-on nails" />
            <span className="candy-sticker is-gum" style={{ position: "absolute", top: 16, left: 16 }}>NEW DROP ✦</span>
            <span className="candy-sticker is-soda" style={{ position: "absolute", bottom: 18, right: 16, color: "var(--cream)" }}>caught IRL</span>
          </div>
        </section>

        {/* marquee pill */}
        <div className="lb-bar candy-marquee" style={{ marginTop: "clamp(34px,5vw,56px)", position: "relative", zIndex: 1 }}>
          <div className="lb-bar-track">
            {[...HYPE, ...HYPE].map((w, i) => (
              <span key={i}>{w} <span aria-hidden>✦</span></span>
            ))}
          </div>
        </div>

        {/* LOOKS */}
        <section id="looks" style={{ marginTop: "clamp(56px,8vw,96px)", position: "relative", zIndex: 1, scrollMarginTop: 90 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
            <div>
              <span className="candy-eyebrow">The lineup</span>
              <h2 style={{ fontSize: "clamp(32px,5vw,58px)", marginTop: 8 }}>Shop by mood</h2>
            </div>
            <span className="candy-chip" style={{ background: "var(--lemon)" }}>{LOOKS.length} looks ✦</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {LOOKS.map((l) => (
              <Link key={l.handle} href={`/lookbook/${l.handle}`} className="lb-card">
                { }
                <img src={l.src} alt={l.alt} loading="lazy" />
                <div className="lb-card-grad">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <span className="lb-num">{l.num}</span>
                    <span className="lb-kick">{l.tag}</span>
                  </div>
                  <div>
                    <h3 className="lb-card-title">{l.title}</h3>
                    <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "rgba(230,213,235,0.92)", maxWidth: 360 }}>{l.desc}</p>
                    <span className="candy-chip" style={{ marginTop: 16, background: "var(--lemon)" }}>Shop the look →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* UGC WALL — full-bleed marquee */}
      <section style={{ marginBottom: "clamp(56px,8vw,100px)" }}>
        <div className="candy-wrap" style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="candy-eyebrow">Caught in the wild</span>
              <h2 style={{ fontSize: "clamp(30px,5vw,52px)", marginTop: 8 }}>Tagged <span className="lb-hl">#Nailismo</span></h2>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)", maxWidth: 280 }}>
              Real sets on real hands — straight off the feed.
            </p>
          </div>
        </div>

        <div className="lb-wall" aria-label="Customer nail looks">
          <div className="lb-wall-track">
            {[...UGC, ...UGC].map((u, i) => (
              <div className="lb-wall-item" key={i}>
                { }
                <img src={`/images/lookbook/${u}.avif`} alt="Customer nail look tagged Nailismo" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="candy-wrap" style={{ marginBottom: "clamp(64px,9vw,120px)" }}>
        <div className="lb-cta">
          <div className="candy-blob" aria-hidden style={{ width: 260, height: 260, background: "var(--bubblegum)", top: -60, left: -40, opacity: 0.35 }} />
          <div className="candy-blob" aria-hidden style={{ width: 240, height: 240, background: "var(--grape)", bottom: -70, right: -30, opacity: 0.4 }} />
          <span className="candy-eyebrow" style={{ color: "var(--lemon)", position: "relative", zIndex: 1 }}>Pick your fighter</span>
          <h2 style={{ fontSize: "clamp(32px,5.5vw,62px)", color: "var(--cotton)", position: "relative", zIndex: 1 }}>Find the set that ate</h2>
          <p style={{ position: "relative", zIndex: 1, maxWidth: 440, fontWeight: 600, color: "rgba(230,213,235,0.82)" }}>
            10 premium nails + the toolkit. On in minutes, lasts up to 7 days. No salon, no appointment, no notes.
          </p>
          <Link href="/shop" className="candy-btn" style={{ position: "relative", zIndex: 1, marginTop: 8 }}>
            Shop all sets <span className="pop" aria-hidden>🛍️</span>
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
