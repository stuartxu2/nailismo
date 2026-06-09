import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact · Nailismo",
  description:
    "Get in touch with Nailismo. Customer care, wholesale, press, and partnerships.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  { num: "01", label: "Customer Care", handle: "hello@nailismo.com", href: "mailto:hello@nailismo.com", note: "Order issues, sizing, returns. Replies within one business day." },
  { num: "02", label: "Wholesale", handle: "stockists@nailismo.com", href: "mailto:stockists@nailismo.com", note: "Boutiques, salons, retail. Minimums and lookbook on request." },
  { num: "03", label: "Press", handle: "press@nailismo.com", href: "mailto:press@nailismo.com", note: "Editorial, samples, interviews. High-res assets available." },
  { num: "04", label: "Partnerships", handle: "partners@nailismo.com", href: "mailto:partners@nailismo.com", note: "Collaborations, licensing, custom drops." },
];

const SOCIAL = [
  { label: "Instagram", handle: "@shopnailismo", href: "https://instagram.com/shopnailismo" },
  { label: "TikTok", handle: "@shopnailismo", href: "https://tiktok.com/@shopnailismo" },
  { label: "X", handle: "@shopnailismo", href: "https://x.com/shopnailismo" },
  { label: "Pinterest", handle: "@shopnailismo", href: "https://pinterest.com/shopnailismo" },
];

export default function ContactPage() {
  return (
    <>
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Contact</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Say hi</span>
          <h1 style={{ marginTop: 10 }}>Get in touch</h1>
          <p>Pick the right channel below — we read every message, and most replies land within one business day.</p>
        </div>

        <div style={{ marginTop: 48, display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {CHANNELS.map((c) => (
            <article key={c.num} style={{ background: "var(--cream)", border: "2.5px solid var(--ink)", borderRadius: 24, padding: 26, boxShadow: "var(--shadow-candy)" }}>
              <span className="candy-eyebrow">{c.label}</span>
              <a href={c.href} style={{ display: "block", fontFamily: "var(--display)", fontSize: 24, lineHeight: 1.1, marginTop: 8, color: "var(--soda)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                {c.handle}
              </a>
              <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.6 }}>{c.note}</p>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 32, background: "var(--cream)", border: "2.5px solid var(--ink)", borderRadius: 24, padding: 26, boxShadow: "var(--shadow-candy)" }}>
          <span className="candy-eyebrow" style={{ display: "block", marginBottom: 14 }}>Find us online</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="candy-chip">{s.label} · {s.handle}</a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
