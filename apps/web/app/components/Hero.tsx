export function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="nail-container relative z-10 pt-20 md:pt-24 pb-20 md:pb-28 grid grid-cols-12 gap-6 md:gap-12 items-end min-h-[84vh]">
        <div className="col-span-12 lg:col-span-6 relative">
          <span className="cap rise">Press-on · for men</span>
          <h1 className="font-display font-light tracking-tightest leading-[0.92] text-[clamp(48px,8vw,120px)] mt-6 rise delay-1">
            <span className="block">Press-On</span>
            <span className="block">Nails for Men</span>
          </h1>
          <p className="max-w-[440px] mt-8 text-[16px] md:text-[17px] text-rikyu leading-relaxed rise delay-2">
            Clean sets. Fast wear. Built for everyday styling — alongside the rings, the knit, the watch.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 rise delay-3">
            <a href="#new-arrivals" className="btn-primary">
              Shop Sets <span className="arrow">→</span>
            </a>
            <a href="#fit" className="btn-ghost">
              Find My Size <span className="arrow">→</span>
            </a>
          </div>
          <div className="mt-14 h-px w-10 bg-akane rise delay-4" />
        </div>

        <div className="col-span-12 lg:col-span-6 relative h-[58vh] md:h-[74vh] rise delay-2">
          <figure className="absolute inset-0 overflow-hidden shadow-editorial">
            <img
              src="/images/website/hero-monochrome-minimal.avif"
              alt="Man's hand wearing clean press-on nails with a ring and knitwear"
              className="img-cover"
              loading="eager"
            />
          </figure>
        </div>
      </div>

      <div className="border-t border-hair">
        <div className="nail-container py-4 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
          <span>S–XL fit · Applies in minutes · Removes cleanly</span>
          <span className="hidden md:inline">Scroll <span className="ml-2 inline-block translate-y-[1px]">↓</span></span>
        </div>
      </div>
    </section>
  );
}
