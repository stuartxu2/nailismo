export function CulturalAnchor() {
  return (
    <section className="bg-toriko sec relative overflow-hidden">
      <div className="nail-container grid grid-cols-12 gap-6 md:gap-12">
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="cap">N°03</span>
              <span className="cap">Cultural Anchor</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              Your hands
              <br />
              are part of
              <br />
              the <span className="italic font-serif font-light">outfit</span>
              <span className="text-akane">.</span>
            </h2>
            <p className="max-w-[440px] mt-8 text-[16px] md:text-[17px] text-rikyu">
              You choose the watch, the ring, the scent, the shoes, the jacket. Your hands should carry the same intention. Nailismo turns the most visible detail into a finished part of your style.
            </p>
          </div>
          <div className="mt-12">
            <div className="border-t border-hair pt-6 max-w-[440px] flex items-start gap-6">
              <span className="font-serif italic text-[64px] leading-none text-akane">&ldquo;</span>
              <p className="text-[15px] italic font-serif text-rikyu">
                Socks disappear. Ties come off. Your hands stay visible.
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div className="grid grid-cols-3 gap-px bg-[var(--hair)] border border-hair">
            <div className="acc-tile bg-paper flex flex-col justify-between p-5">
              <span className="cap">01 — Watch</span>
              <svg viewBox="0 0 100 100" className="w-full h-auto mx-auto my-4" fill="none" stroke="#281A14" strokeWidth="1.4">
                <circle cx="50" cy="50" r="26" />
                <path d="M50 30v20l12 6" />
                <path d="M44 24h12M44 76h12" />
              </svg>
              <span className="text-[11px] uppercase tracking-[0.18em] text-tetsu">Time</span>
            </div>
            <div className="acc-tile bg-paper flex flex-col justify-between p-5">
              <span className="cap">02 — Ring</span>
              <svg viewBox="0 0 100 100" className="w-full h-auto mx-auto my-4" fill="none" stroke="#281A14" strokeWidth="1.4">
                <ellipse cx="50" cy="58" rx="22" ry="20" />
                <path d="M38 38l4-12h16l4 12" />
                <circle cx="50" cy="32" r="3" fill="#281A14" />
              </svg>
              <span className="text-[11px] uppercase tracking-[0.18em] text-tetsu">Signet</span>
            </div>
            <div className="acc-tile bg-paper flex flex-col justify-between p-5">
              <span className="cap">03 — Scent</span>
              <svg viewBox="0 0 100 100" className="w-full h-auto mx-auto my-4" fill="none" stroke="#281A14" strokeWidth="1.4">
                <rect x="34" y="30" width="32" height="50" rx="2" />
                <rect x="42" y="18" width="16" height="12" />
                <path d="M42 50h16M42 60h16" />
              </svg>
              <span className="text-[11px] uppercase tracking-[0.18em] text-tetsu">Signal</span>
            </div>
            <div className="acc-tile bg-paper flex flex-col justify-between p-5">
              <span className="cap">04 — Sneakers</span>
              <svg viewBox="0 0 100 100" className="w-full h-auto mx-auto my-4" fill="none" stroke="#281A14" strokeWidth="1.4">
                <path d="M14 66c8-4 18-6 28-8 6-1 10-6 14-12l10 6c8 4 18 6 22 12-6 4-46 10-74 8z" />
                <path d="M52 56l4 6M46 58l3 6M40 60l2 6" />
              </svg>
              <span className="text-[11px] uppercase tracking-[0.18em] text-tetsu">Step</span>
            </div>
            <div className="acc-tile is-product flex flex-col justify-between p-0 relative overflow-hidden">
              <img
                src="/images/listing/black and white press on nails.avif"
                alt="Monochrome Edge masculine press-on manicure for men, the missing detail"
                className="absolute inset-0 w-full h-full object-cover opacity-95"
              />
              <div className="relative z-10 p-5 flex flex-col justify-between h-full bg-gradient-to-b from-[rgba(40,26,20,0.4)] via-transparent to-[rgba(40,26,20,0.85)]">
                <div className="flex items-center justify-between">
                  <span className="cap cap-dark">05 — Nails</span>
                  <span className="tape">Missing detail</span>
                </div>
                <div>
                  <div className="font-display text-[26px] leading-[0.95] text-paper">Nailismo</div>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[rgba(245,245,245,0.85)]">
                    Wear Your Edge
                  </span>
                </div>
              </div>
            </div>
            <div className="acc-tile bg-paper flex flex-col justify-between p-5">
              <span className="cap">06 — Tailoring</span>
              <svg viewBox="0 0 100 100" className="w-full h-auto mx-auto my-4" fill="none" stroke="#281A14" strokeWidth="1.4">
                <path d="M30 18l20 14 20-14 14 12-10 60H26L16 30z" />
                <path d="M50 32v54M40 50l6-6M60 50l-6-6" />
              </svg>
              <span className="text-[11px] uppercase tracking-[0.18em] text-tetsu">Form</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-px cap">
            <span>Daily-wear hardware</span>
            <span className="text-center">Visible · Curated · Owned</span>
            <span className="text-right">— since 26</span>
          </div>
        </div>
      </div>
    </section>
  );
}
