import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { Faq } from "@/app/components/Faq";

export const metadata: Metadata = {
  title: "FAQ · Nailismo",
  description:
    "Sizing, wear, removal, and styling — direct answers to the questions men actually ask about press-on manicures.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main>
        <section className="candy-wrap" style={{ paddingTop: 36 }}>
          <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Link href="/" className="candy-crumb">Home</Link>
            <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>FAQ</span>
          </nav>
          <div className="candy-pagehead">
            <span className="candy-eyebrow">Help</span>
            <h1 style={{ marginTop: 10 }}>Frequently asked</h1>
            <p>Sizing, wear, removal, styling — the quick answers, no fuss.</p>
          </div>
        </section>
        <Faq />
      </main>
      <Footer />
    </>
  );
}
