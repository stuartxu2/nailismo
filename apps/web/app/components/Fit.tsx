import Link from "next/link";
export function Fit() {
  return (
    <section id="fit" className="bg-paper sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-start">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">N°06</span>
              <span className="cap">Fit System</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              Built to fit
              <br />
              <span className="italic font-serif font-light">men&apos;s hands</span>
              <span className="text-akane">.</span>
            </h2>
            <p className="max-w-[440px] mt-8 text-[16px] md:text-[17px] text-rikyu">
              Men&apos;s hands vary in width, nail-bed shape, and proportion. Each starter set includes a full sizing range so you can test the fit before committing to your final look.
            </p>

            <div className="mt-10 space-y-px bg-[var(--hair)] border border-hair">
              <div className="bg-paper p-5 flex items-start gap-5">
                <span className="font-display text-[32px] leading-none text-tetsu">24</span>
                <div>
                  <h4 className="font-display text-[18px]">Size Options</h4>
                  <p className="text-[14px] text-rikyu mt-1">A wider range to fit narrow, average, and broader nail beds.</p>
                </div>
              </div>
              <div className="bg-paper p-5 flex items-start gap-5">
                <span className="font-display text-[32px] leading-none text-tetsu">02</span>
                <div>
                  <h4 className="font-display text-[18px]">Wear Modes</h4>
                  <p className="text-[14px] text-rikyu mt-1">Temporary tabs for short wear. Liquid adhesive for longer hold.</p>
                </div>
              </div>
              <div className="bg-paper p-5 flex items-start gap-5">
                <span className="font-display text-[32px] leading-none text-tetsu">01</span>
                <div>
                  <h4 className="font-display text-[18px]">Clean Removal</h4>
                  <p className="text-[14px] text-rikyu mt-1">Designed for easy removal when applied and removed correctly.</p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Link href="/fit" className="btn-primary">
                See How Sizing Works <span className="arrow">→</span>
              </Link>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 relative">
            <div className="relative border border-hair p-6 md:p-10 bg-toriko">
              <span className="crosshair" style={{ left: "-8px", top: "-8px" }} />
              <span className="crosshair" style={{ right: "-8px", top: "-8px" }} />
              <span className="crosshair" style={{ left: "-8px", bottom: "-8px" }} />
              <span className="crosshair" style={{ right: "-8px", bottom: "-8px" }} />

              <div className="flex items-center justify-between mb-4">
                <span className="cap">Fig. 01 — Size Chart · mm</span>
                <span className="cap">S · M · L · XL</span>
              </div>

              <svg viewBox="0 0 600 280" className="w-full h-auto">
                <line x1="40" y1="240" x2="560" y2="240" stroke="#281A14" strokeWidth="0.7" />
                <g stroke="#281A14" strokeWidth="0.5">
                  <line x1="40" y1="240" x2="40" y2="248" />
                  <line x1="170" y1="240" x2="170" y2="248" />
                  <line x1="300" y1="240" x2="300" y2="248" />
                  <line x1="430" y1="240" x2="430" y2="248" />
                  <line x1="560" y1="240" x2="560" y2="248" />
                </g>
                <g fontSize="9" fill="#281A14" fontFamily="JetBrains Mono" textAnchor="middle">
                  <text x="40" y="262">7mm</text>
                  <text x="170" y="262">10mm</text>
                  <text x="300" y="262">13mm</text>
                  <text x="430" y="262">16mm</text>
                  <text x="560" y="262">18mm</text>
                </g>
                <g transform="translate(60,60)">
                  <g fill="#281A14" opacity="0.92">
                    <rect x="60" y="-6" width="40" height="56" rx="16" />
                    <rect x="126" y="-14" width="46" height="68" rx="18" />
                    <rect x="200" y="-20" width="52" height="80" rx="20" />
                    <rect x="280" y="-28" width="60" height="94" rx="24" />
                  </g>
                </g>
                <g fontSize="9" fill="#281A14" fontFamily="JetBrains Mono" textAnchor="middle">
                  <text x="140" y="180">S</text>
                  <text x="208" y="180">M</text>
                  <text x="286" y="180">L</text>
                  <text x="370" y="180">XL</text>
                </g>
                <g fontSize="10" fill="#281A14" fontFamily="JetBrains Mono">
                  <text x="40" y="30" letterSpacing="2">NAIL · WIDTH · MEASUREMENT</text>
                  <text x="560" y="30" textAnchor="end" letterSpacing="2">S–XL · 4 SIZES</text>
                </g>
              </svg>

              <div className="mt-6 grid grid-cols-3 gap-4 text-[12px] text-[rgba(40,26,20,0.85)]">
                <div className="border-t border-hair pt-3">
                  <span className="cap">Step 01</span>
                  <p className="mt-1">Place clear tape across the widest part of your nail.</p>
                </div>
                <div className="border-t border-hair pt-3">
                  <span className="cap">Step 02</span>
                  <p className="mt-1">Mark the tape at the sides of your nail bed.</p>
                </div>
                <div className="border-t border-hair pt-3">
                  <span className="cap">Step 03</span>
                  <p className="mt-1">Place tape on a ruler to read the width in mm.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 items-start">
              <figure className="col-span-2 relative aspect-[4/3] overflow-hidden border border-hair">
                <img
                  src="/images/listing/accessories.jpg"
                  alt="Nailismo starter kit — adhesive tabs, cuticle stick, file, branded box"
                  className="img-cover"
                />
                <figcaption className="absolute bottom-2 left-3 cap" style={{ color: "#F2EDE0" }}>
                  In the box · tabs · stick · file · branded case
                </figcaption>
              </figure>
              <div className="col-span-1 flex flex-col gap-3 text-[12px]">
                <div className="border-t border-hair pt-3">
                  <span className="cap">Tabs</span>
                  <p className="mt-1 text-rikyu">For one-night wear or testing the fit.</p>
                </div>
                <div className="border-t border-hair pt-3">
                  <span className="cap">Liquid Adhesive</span>
                  <p className="mt-1 text-rikyu">Up to 7+ days, depending on application.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
