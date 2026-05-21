import Link from "next/link";
import { LOOKS } from "@/app/lookbook/data";

export function Lookbook() {
  return (
    <section id="lookbook" className="bg-toriko sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">N°09</span>
              <span className="cap">Lookbook</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              Built for the
              <br />
              <span className="italic font-serif font-light">fit check</span>
              <span className="text-akane">.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 flex flex-col justify-end">
            <p className="text-rikyu text-[17px] max-w-[420px]">
              The same outfit reads differently when the hands are finished.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-0">
        {LOOKS.map((l) => (
          <Link
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
                <h3 className="font-display text-[clamp(34px,4vw,56px)] leading-[0.95] tracking-display text-paper">
                  {l.title}
                </h3>
                <p className="mt-2 text-[13px] text-[rgba(245,245,245,0.85)] max-w-[360px]">{l.desc}</p>
                <span className="mt-5 inline-block text-[12px] uppercase tracking-[0.18em] font-medium ulink text-paper">
                  {l.cta}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="nail-container mt-12 flex items-center justify-between flex-wrap gap-4">
        <span className="cap">Same outfit. Finished read.</span>
        <Link href="/lookbook" className="btn-ghost">
          Open The Lookbook <span className="arrow">→</span>
        </Link>
      </div>
    </section>
  );
}
