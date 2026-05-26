import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { LOOKS } from "./data";

export const metadata: Metadata = {
  title: "Lookbook · Nailismo",
  description:
    "Every Nailismo look — outfit, finish, pairing. Built for the fit check.",
  alternates: { canonical: "/lookbook" },
};

export default function LookbookIndexPage() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Lookbook</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Style it up</span>
          <h1 style={{ marginTop: 10 }}>The lookbook</h1>
          <p>Real hands, real fits. Each look maps to one set — find your vibe. <strong>{LOOKS.length}</strong> looks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ marginTop: 40 }}>
          {LOOKS.map((l) => (
            <Link
              key={l.handle}
              href={`/lookbook/${l.handle}`}
              className="look-card block"
              style={{ position: "relative", aspectRatio: "4/5", borderRadius: 28, overflow: "hidden", border: "2.5px solid var(--ink)", boxShadow: "var(--shadow-candy)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.src} alt={l.alt} />
              <div
                className="look-overlay absolute inset-0 flex flex-col justify-between p-7"
                style={{ background: "linear-gradient(to top, rgba(39,16,40,0.92) 0%, rgba(39,16,40,0.5) 45%, rgba(39,16,40,0.2) 100%)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="candy-sticker is-gum">{l.num}</span>
                </div>
                <div>
                  <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(32px,4vw,52px)", lineHeight: 0.98, color: "var(--cotton)" }}>{l.title}</h2>
                  <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "rgba(230,213,235,0.9)", maxWidth: 360 }}>{l.desc}</p>
                  <span className="candy-chip" style={{ marginTop: 16 }}>Read look →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
