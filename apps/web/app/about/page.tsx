import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "About · Nailismo",
  description:
    "Nailismo makes press-on manicures engineered for men's hands. Sharp, durable, built to finish the look — from tailoring to streetwear.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    num: "01",
    title: "Fit, first.",
    body: "S–XL fit shaped to men's nail beds. Wider arch, deeper curve, longer free edge.",
  },
  {
    num: "02",
    title: "Finish, always.",
    body: "Salon-grade gel layered with cat-eye, chrome, and matte tops. No chalky polymer feel.",
  },
  {
    num: "03",
    title: "Wear, on your terms.",
    body: "Tabs for an evening. Liquid adhesive for a week. Remove without wrecking your beds.",
  },
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
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <a href="/" className="ulink">Home</a>
              <span>/</span>
              <span className="text-tetsu">About</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">House Doctrine</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  Press-ons,
                  <br />
                  <span className="italic font-serif font-light">re-engineered</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">
                  Built so a man can finish his look in five minutes — without a
                  salon, without explanation, without compromise.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-16 md:pt-24">
          <div className="nail-container grid grid-cols-12 gap-10">
            <div className="col-span-12 md:col-span-5">
              <span className="cap mb-4 block">Origin</span>
              <h2 className="font-display text-[32px] md:text-[40px] leading-[1.05]">
                Started because <span className="italic font-serif">nothing fit</span>.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-7 text-[16px] text-rikyu leading-[1.7] space-y-4 max-w-[640px]">
              <p>
                Off-the-shelf press-ons are sized for women. Narrower beds,
                shorter free edges, finishes that read soft. When men wanted
                the look, the options were salon gel (expensive, fragile) or
                nothing.
              </p>
              <p>
                Nailismo started with a single goal: build a press-on system
                that fits a man&apos;s hand, holds up to a week of real wear,
                and finishes a fit the way a good watch or a tailored cuff does.
              </p>
              <p>
                Every set ships with an S–XL size range, two adhesive options
                (sticky tabs and liquid glue), and a finish that earns a second
                look across a room.
              </p>
            </div>
          </div>
        </section>

        <section className="sec pt-0">
          <div className="nail-container">
            <div className="border-t border-hair pt-12">
              <span className="cap mb-8 block">Three Pillars</span>
              <div className="grid grid-cols-12 gap-6">
                {PILLARS.map((p) => (
                  <article
                    key={p.num}
                    className="col-span-12 md:col-span-4 border border-hair p-8 bg-paper relative"
                  >
                    <span className="corner-mark top-4 right-4">{p.num}</span>
                    <h3 className="font-display text-[26px] leading-[1.1] mt-6">
                      {p.title}
                    </h3>
                    <p className="mt-4 text-rikyu text-[15px] leading-[1.65]">
                      {p.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-0">
          <div className="nail-container">
            <div className="bg-tetsu text-paper p-12 md:p-16 relative overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {SPECS.map((s) => (
                  <div key={s.label} className="spec spec-dark">
                    <strong>{s.value}</strong>
                    <span className="cap cap-dark mt-2 block">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <span className="cap cap-dark">Built for men&apos;s hands · since 2024</span>
                <a href="/shop" className="btn-on-dark">
                  Open The Index <span className="arrow">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
