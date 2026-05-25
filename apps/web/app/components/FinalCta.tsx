export function FinalCta() {
  return (
    <section className="bg-paper sec relative overflow-hidden">
      <div className="nail-container relative">
        <div className="relative z-10 grid grid-cols-12 gap-6 md:gap-12 items-end">
          <div className="col-span-12 md:col-span-8">
            <h2 className="font-display font-light tracking-display leading-[0.88] text-[clamp(56px,9vw,140px)]">
              Start your
              <br />
              <span className="italic font-serif font-light">first set</span>
              <span className="text-akane">.</span>
            </h2>
            <p className="mt-8 max-w-[520px] text-[17px] text-rikyu">
              Your first manicure should be easy. Start with a clean, wearable design made to work with what you already wear.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#new-arrivals" className="btn-primary">
                Shop Sets <span className="arrow">→</span>
              </a>
              <a href="/shop" className="btn-ghost">
                Explore All Styles <span className="arrow">→</span>
              </a>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="relative aspect-[3/4] overflow-hidden border border-hair">
              <img
                src="/images/website/5d3e61a43b59defc2690e54e10d408ec.avif"
                alt="Group of masculine hands wearing different Nailismo edits in a dark setting"
                className="img-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(40,26,20,0.4)] to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
