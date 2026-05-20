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
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <a href="/" className="ulink">Home</a>
              <span>/</span>
              <span className="text-tetsu">Lookbook</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">Fit Check Archive</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  The
                  <br />
                  <span className="italic font-serif font-light">lookbook</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-5">
                <p className="text-rikyu max-w-[420px]">
                  Four anchors. Same hands, different rooms. Each look maps to
                  one set — pick the one your week needs.
                </p>
                <div className="mt-6 cap">{LOOKS.length} looks</div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-12 grid grid-cols-12 gap-0">
              {LOOKS.map((l) => (
                <a
                  key={l.handle}
                  href={`/lookbook/${l.handle}`}
                  className={`look-card col-span-12 md:col-span-6 aspect-[4/5] block ${l.borderClasses}`}
                >
                  <img src={l.src} alt={l.alt} />
                  <div
                    className="look-overlay absolute inset-0 flex flex-col justify-between p-8"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(40,26,20,0.92) 0%, rgba(40,26,20,0.55) 45%, rgba(40,26,20,0.25) 100%)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={l.tapeClass}>{l.num}</span>
                      <span className="cap cap-dark">{l.title}</span>
                    </div>
                    <div>
                      <h2 className="font-display text-[clamp(34px,4vw,56px)] leading-[0.95] tracking-display text-paper">
                        {l.title}
                      </h2>
                      <p className="mt-2 text-[13px] text-[rgba(245,245,245,0.85)] max-w-[360px]">
                        {l.desc}
                      </p>
                      <span className="mt-5 inline-block text-[12px] uppercase tracking-[0.18em] font-medium ulink text-paper">
                        Read look →
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
