import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "About · Nailismo",
  description:
    "Nailismo makes press-on nails that are pure fun — bright, collectible sets that press on in minutes and remove clean. For anyone.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  { num: "01", emoji: "💅", title: "Fit, first.", body: "S–XL sizing in every set — wider arch, deeper curve, real coverage so they sit right." },
  { num: "02", emoji: "✨", title: "Finish, always.", body: "Salon-grade gel in gloss, chrome, sheer, and matte. No chalky press-on feel." },
  { num: "03", emoji: "🍬", title: "Wear, your way.", body: "Tabs for a night, glue for a week. Pops off clean when you're done — no damage." },
];

const SPECS = [
  { label: "Sets shipped", value: "12k+" },
  { label: "Average wear", value: "7d" },
  { label: "Sizes per set", value: "S–XL" },
  { label: "Salon visits", value: "0" },
];

export default function AboutPage() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>About</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Our story</span>
          <h1 style={{ marginTop: 10 }}>Press-ons, made fun</h1>
          <p>Bright, collectible nail sets that press on in minutes and remove clean. No salon, no commitment — just joy you can wear. For anyone.</p>
        </div>

        <section style={{ marginTop: 48, display: "grid", gap: 28, gridTemplateColumns: "1fr" }} className="md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="candy-eyebrow">Origin</span>
            <h2 style={{ fontSize: "clamp(30px,4vw,46px)", marginTop: 10 }}>Started because nails should be fun</h2>
          </div>
          <div className="candy-prose">
            <p>Most press-ons take themselves a little too seriously — beige boxes, fussy rules, salon-coded everything. We wanted the opposite: a rack of bright flavors you grab on a whim.</p>
            <p>So Nailismo is built around one feeling — instant, low-stakes fun. Pick a set, press it on in minutes, show it off all week, pop it off clean.</p>
            <p>Every set ships with an S–XL size range, two adhesive options (tabs and liquid glue), and a finish that earns a second look across the room.</p>
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <span className="candy-eyebrow" style={{ display: "block", marginBottom: 24 }}>Three pillars</span>
          <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {PILLARS.map((p) => (
              <article key={p.num} className="candy-step">
                <div style={{ fontSize: 38 }} aria-hidden>{p.emoji}</div>
                <h3 style={{ fontSize: 26, marginTop: 14 }}>{p.title}</h3>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-soft)", marginTop: 8 }}>{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <div style={{ background: "var(--ink)", color: "var(--cotton)", borderRadius: 28, padding: "clamp(32px,5vw,56px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 28 }} className="md:grid-cols-4">
              {SPECS.map((s) => (
                <div key={s.label}>
                  <strong style={{ fontFamily: "var(--display)", fontSize: 44, lineHeight: 1, color: "var(--lemon)", display: "block" }}>{s.value}</strong>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(230,213,235,0.7)", marginTop: 6, display: "block" }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontWeight: 700, color: "rgba(230,213,235,0.7)" }}>Fun nails for everyone · since 2024</span>
              <Link href="/shop" className="candy-btn">Shop the rack <span className="pop" aria-hidden>🍬</span></Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
