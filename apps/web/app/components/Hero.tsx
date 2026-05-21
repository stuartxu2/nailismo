export function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="corner-mark top-6 left-6">N°01 / Hero</div>
      <div className="corner-mark top-6 right-6">52.3717° N, 4.8910° E</div>
      <div className="corner-mark bottom-6 left-6">SS / AW · 26</div>
      <div className="corner-mark bottom-6 right-6">Nailismo / Edition 01</div>

      <div className="nail-container relative z-10 pt-20 md:pt-24 pb-20 md:pb-28 grid grid-cols-12 gap-6 md:gap-10 items-end min-h-[88vh]">
        <div className="col-span-12 lg:col-span-6 relative">
          <div className="flex items-center gap-3 mb-8 rise">
            <span className="tape">N°00 / Manifesto</span>
            <span className="cap">Wear · Your · Edge</span>
          </div>
          <h1 className="font-display font-light tracking-tightest leading-[0.88] text-[clamp(56px,9.5vw,150px)] rise delay-1">
            <span className="block">The Final</span>
            <span className="block italic font-thin">
              Detail<span className="text-akane not-italic">.</span>
            </span>
          </h1>
          <p className="max-w-[520px] mt-10 text-[17px] md:text-[18px] text-rikyu leading-relaxed rise delay-2">
            Press-on manicures designed for men&apos;s hands. Sharp, durable, and built to finish the look — from tailoring to streetwear.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 rise delay-3">
            <a href="#starter-gateway" className="btn-primary">
              Shop Starter Sets <span className="arrow">→</span>
            </a>
            <a href="#fit" className="btn-ghost">
              See The Fit System <span className="arrow">→</span>
            </a>
          </div>

          <div className="mt-14 grid grid-cols-3 max-w-[560px] border-t border-hair pt-6 rise delay-4">
            <div className="spec border-r border-hair pr-4">
              <strong>24</strong>
              <span className="cap mt-2 block">Sizes / Set</span>
            </div>
            <div className="spec border-r border-hair px-4">
              <strong>7+</strong>
              <span className="cap mt-2 block">Days Wear</span>
            </div>
            <div className="spec pl-4">
              <strong>
                05<span className="text-akane">′</span>
              </strong>
              <span className="cap mt-2 block">Application</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 relative h-[60vh] md:h-[78vh] rise delay-2">
          <div className="absolute inset-0">
            <figure className="absolute right-0 top-0 w-[78%] h-[78%] overflow-hidden shadow-editorial">
              <img
                src="/images/website/hero-monochrome-minimal.avif"
                alt="Man clasping hands with white press-on nails in minimalist black line-and-dot art"
                className="img-cover"
                loading="eager"
              />
              <span className="crosshair" style={{ left: "-8px", top: "-8px" }} />
              <span className="crosshair" style={{ right: "-8px", bottom: "-8px" }} />
            </figure>
            <figure className="absolute left-0 bottom-0 w-[44%] h-[44%] border border-hair bg-toriko p-3 shadow-editorial">
              <img
                src="/images/listing/black and white press on nails.avif"
                alt="Monochrome Edge black-and-white press-on nails arranged in a sizing grid"
                className="img-cover"
                loading="eager"
              />
              <figcaption className="absolute -bottom-7 left-0 cap">
                N°01 — Monochrome Edge · Squoval · Long-wear
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <div className="border-t border-hair">
        <div className="nail-container py-4 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
          <span>S–XL Fit · Temporary or long-wear adhesive · No salon required</span>
          <span className="hidden md:inline">
            Scroll <span className="ml-2 inline-block translate-y-[1px]">↓</span>
          </span>
        </div>
      </div>
    </section>
  );
}
