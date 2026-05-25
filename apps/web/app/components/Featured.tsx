import Link from "next/link";
export function Featured() {
  return (
    <section id="featured" className="bg-toriko sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-stretch border border-hair bg-tetsu">
          <div className="col-span-12 lg:col-span-7 relative aspect-[5/4] lg:aspect-auto bg-paper">
            <img
              src="/images/listing/black and white press on nails.avif"
              alt="Monochrome Edge — black-and-white architectural press-on nails for men"
              className="img-cover"
            />
            <div className="absolute top-6 left-6 right-6 flex items-center">
              <span className="cap">Editor pick</span>
            </div>
            <div className="absolute bottom-6 left-6 cap">Handle · monochrome-edge</div>
            <div className="absolute bottom-6 right-6 cap">Squoval · Short · Gloss</div>
          </div>
          <div className="col-span-12 lg:col-span-5 p-8 md:p-12 flex flex-col justify-between text-paper">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="cap cap-dark">Best for first sets</span>
              </div>
              <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(36px,4.4vw,68px)]">
                Start with the set
                <br />
                built for <span className="italic font-serif font-light">first-time wear</span>
                <span className="text-akane">.</span>
              </h2>
              <p className="mt-6 text-[16px] text-[rgba(245,245,245,0.85)] max-w-[440px]">
                <strong className="text-paper font-medium">Monochrome Edge.</strong> A dark, masculine take on architectural contrast. Clean enough for daily wear, sharp enough to get noticed.
              </p>

              <ul className="mt-8 grid grid-cols-1 gap-px bg-[rgba(242,237,224,0.18)] border border-hair-dark">
                <li className="bg-tetsu py-3 px-4 flex items-center justify-between text-[13px]">
                  <span className="cap cap-dark">Includes</span>
                  <span>S · M · L · XL fit</span>
                </li>
                <li className="bg-tetsu py-3 px-4 flex items-center justify-between text-[13px]">
                  <span className="cap cap-dark">Wear</span>
                  <span>Tabs + liquid adhesive</span>
                </li>
                <li className="bg-tetsu py-3 px-4 flex items-center justify-between text-[13px]">
                  <span className="cap cap-dark">Tools</span>
                  <span>Prep kit + application guide</span>
                </li>
                <li className="bg-tetsu py-3 px-4 flex items-center justify-between text-[13px]">
                  <span className="cap cap-dark">Signal</span>
                  <span>Architectural · Gloss detail</span>
                </li>
              </ul>

              <div className="mt-6 grid grid-cols-1 gap-2 text-[13px] text-[rgba(245,245,245,0.85)]">
                <div className="flex items-start gap-3">
                  <span className="cap text-akane mt-[2px]">Fit</span>
                  <span>Full sizing range for narrow, average, and broader nail beds.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="cap text-akane mt-[2px]">Wear</span>
                  <span>One night with tabs · up to 7+ days with liquid adhesive.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="cap text-akane mt-[2px]">Stars</span>
                  <span>★★★★★ 4.9 / 5 — 248 reviews</span>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-baseline justify-between border-t border-hair-dark pt-6">
                <div>
                  <span className="cap cap-dark">Price</span>
                  <div className="font-display text-[40px] leading-none mt-1">
                    $19<span className="text-akane">.</span>
                    <span className="text-[18px] align-top">00</span>
                  </div>
                </div>
                <span className="cap cap-dark">In stock · Ships in 24h</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/product/monochrome-edge" className="btn-on-dark">
                  Add To Cart <span className="arrow">→</span>
                </Link>
                <Link href="/product/monochrome-edge" className="btn-ghost-on-dark">
                  View Details <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
