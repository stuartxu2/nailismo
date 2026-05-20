import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Contact · Nailismo",
  description:
    "Get in touch with Nailismo. Press, wholesale, customer care, and partnerships.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    num: "01",
    label: "Customer Care",
    handle: "hello@nailismo.com",
    href: "mailto:hello@nailismo.com",
    note: "Order issues, sizing, returns. Replies within one business day.",
  },
  {
    num: "02",
    label: "Wholesale",
    handle: "stockists@nailismo.com",
    href: "mailto:stockists@nailismo.com",
    note: "Boutiques, salons, hotel retail. Minimums and lookbook on request.",
  },
  {
    num: "03",
    label: "Press",
    handle: "press@nailismo.com",
    href: "mailto:press@nailismo.com",
    note: "Editorial, samples, interviews. High-res assets available.",
  },
  {
    num: "04",
    label: "Partnerships",
    handle: "partners@nailismo.com",
    href: "mailto:partners@nailismo.com",
    note: "Collaborations, licensing, custom drops.",
  },
];

const SOCIAL = [
  { label: "Instagram", handle: "@nailismo", href: "#" },
  { label: "TikTok", handle: "@nailismo", href: "#" },
  { label: "X", handle: "@nailismo", href: "#" },
];

export default function ContactPage() {
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
              <span className="text-tetsu">Contact</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">Front Desk</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  Get
                  <br />
                  <span className="italic font-serif font-light">in touch</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-5">
                <p className="text-rikyu max-w-[420px]">
                  Pick the right channel below. We read every message — most
                  replies land within one business day.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-12 grid grid-cols-12 gap-6">
              {CHANNELS.map((c) => (
                <article
                  key={c.num}
                  className="col-span-12 md:col-span-6 border border-hair p-8 bg-paper relative"
                >
                  <span className="corner-mark top-4 right-4">{c.num}</span>
                  <span className="cap mb-3 block">{c.label}</span>
                  <a
                    href={c.href}
                    className="font-display text-[22px] md:text-[26px] leading-[1.1] ulink"
                  >
                    {c.handle}
                  </a>
                  <p className="mt-4 text-rikyu text-[14px] leading-[1.65] max-w-[360px]">
                    {c.note}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-16 border border-hair p-8 grid grid-cols-12 gap-6 items-start">
              <div className="col-span-12 md:col-span-5">
                <span className="cap mb-3 block">Social</span>
                <h3 className="font-display text-[26px] leading-[1.1]">
                  Off-grid? We&apos;re also on the timeline.
                </h3>
              </div>
              <div className="col-span-12 md:col-span-7 grid grid-cols-3 gap-4">
                {SOCIAL.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="border border-hair p-4 hover:bg-tetsu hover:text-paper transition-colors"
                  >
                    <span className="cap mb-2 block group-hover:text-paper">
                      {s.label}
                    </span>
                    <span className="font-display text-[18px]">{s.handle}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between flex-wrap gap-3 border-t border-hair pt-8">
              <span className="cap">HQ · Brooklyn, NY</span>
              <a href="/about" className="ulink cap">House doctrine →</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
