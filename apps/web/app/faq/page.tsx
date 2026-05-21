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
      <main className="bg-paper relative overflow-hidden">
        <section className="pt-12 md:pt-16 pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <Link href="/" className="ulink">Home</Link>
              <span>/</span>
              <span className="text-tetsu">FAQ</span>
            </nav>
          </div>
        </section>
        <Faq />
      </main>
      <Footer />
    </>
  );
}
