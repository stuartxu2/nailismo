import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { LOOKS, getLook } from "../data";

type Params = { handle: string };

export async function generateStaticParams(): Promise<Params[]> {
  return LOOKS.map((l) => ({ handle: l.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const look = getLook(handle);
  if (!look) return { title: "Look Not Found · Nailismo" };
  return {
    title: `${look.title} · Lookbook · Nailismo`,
    description: look.desc,
    alternates: { canonical: `/lookbook/${look.handle}` },
    openGraph: {
      title: `${look.title} · Lookbook · Nailismo`,
      description: look.desc,
      images: [{ url: look.src }],
      type: "article",
    },
  };
}

export default async function LookPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const look = getLook(handle);
  if (!look) notFound();

  const related = look.related
    .map((h) => getLook(h))
    .filter((l): l is NonNullable<ReturnType<typeof getLook>> => Boolean(l));

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
              <a href="/lookbook" className="ulink">Lookbook</a>
              <span>/</span>
              <span className="text-tetsu">{look.title}</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end mb-12">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className={look.tapeClass}>{look.num}</span>
                  <span className="cap">Lookbook</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(56px,8vw,128px)]">
                  {look.title}
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">{look.desc}</p>
              </div>
            </div>

            <div className="relative aspect-[16/9] md:aspect-[16/7] overflow-hidden bg-shiracha border border-hair">
              <img src={look.src} alt={look.alt} className="img-cover" />
              <span className="corner-mark top-4 left-4 corner-mark-dark">
                {look.handle}
              </span>
              <span className="corner-mark bottom-4 right-4 corner-mark-dark">
                Fit Check · 2026
              </span>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="nail-container grid grid-cols-12 gap-10">
            <div className="col-span-12 md:col-span-5">
              <span className="cap mb-4 block">The Read</span>
              <p className="font-display text-[26px] md:text-[32px] leading-[1.15] text-tetsu">
                {look.story}
              </p>
            </div>
            <div className="col-span-12 md:col-span-7">
              <span className="cap mb-4 block">Outfit Breakdown</span>
              <dl className="border-t border-hair">
                {look.outfit.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between py-4 border-b border-hair gap-6"
                  >
                    <dt className="cap shrink-0 w-24">{row.label}</dt>
                    <dd className="text-[16px] text-tetsu text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="sec pt-0">
          <div className="nail-container">
            <div className="bg-tetsu text-paper p-10 md:p-14 grid grid-cols-12 gap-8 items-center">
              <div className="col-span-12 md:col-span-7">
                <span className="cap cap-dark mb-3 block">The Pairing</span>
                <h2 className="font-display text-[32px] md:text-[44px] leading-[1.05]">
                  {look.pairing.set}
                  <span className="text-akane">.</span>
                </h2>
                <p className="mt-4 text-[15px] text-[rgba(245,245,245,0.78)] max-w-[480px]">
                  {look.pairing.note}
                </p>
              </div>
              <div className="col-span-12 md:col-span-5 flex md:justify-end">
                <a
                  href={`/product/${look.pairing.productHandle}`}
                  className="btn-on-dark"
                >
                  Shop The Set <span className="arrow">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="sec pt-0">
            <div className="nail-container">
              <div className="border-t border-hair pt-12 mb-8 flex items-end justify-between flex-wrap gap-4">
                <h3 className="font-display text-[28px] md:text-[36px] leading-[1.05]">
                  Other looks
                  <span className="text-akane">.</span>
                </h3>
                <a href="/lookbook" className="ulink cap">View all →</a>
              </div>
              <div className="grid grid-cols-12 gap-0">
                {related.map((l) => (
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
                        <h4 className="font-display text-[clamp(32px,3.5vw,48px)] leading-[0.95] tracking-display text-paper">
                          {l.title}
                        </h4>
                        <p className="mt-2 text-[13px] text-[rgba(245,245,245,0.85)] max-w-[360px]">
                          {l.desc}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
