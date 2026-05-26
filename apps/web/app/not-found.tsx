import Link from "next/link";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export default function NotFound() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="candy-wrap candy-sec">
        <div className="candy-empty" style={{ paddingBottom: 32 }}>
          <div className="emoji" aria-hidden>🍬</div>
          <h1 style={{ fontSize: "clamp(72px,14vw,180px)", lineHeight: 0.9, marginTop: 8 }}>404</h1>
          <p style={{ maxWidth: 440, marginInline: "auto" }}>This page slipped off the rack — the link may be stale or the set retired. Try a door below.</p>
        </div>

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {[
            { href: "/shop", emoji: "🛍️", label: "Shop all", h: "Browse every flavor" },
            { href: "/search", emoji: "🔍", label: "Search", h: "Find something specific" },
            { href: "/", emoji: "🏠", label: "Home", h: "Back to the front" },
          ].map((d) => (
            <Link key={d.href} href={d.href} className="candy-step" style={{ display: "block" }}>
              <div style={{ fontSize: 36 }} aria-hidden>{d.emoji}</div>
              <span className="candy-eyebrow" style={{ display: "block", marginTop: 12 }}>{d.label}</span>
              <h2 style={{ fontSize: 24, marginTop: 6 }}>{d.h}</h2>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
