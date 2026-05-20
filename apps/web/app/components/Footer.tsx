export function Footer() {
  return (
    <footer className="bg-tetsu text-paper border-t border-hair-dark">
      <div className="nail-container py-16 md:py-24">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <img src="/images/logo/01.png" alt="Nailismo" className="h-10 logo-invert mb-6" />
            <p className="text-[15px] text-[rgba(245,245,245,0.78)] max-w-[420px]">
              Press-on manicures designed for men&apos;s hands. Sharp, durable, and built to finish the look — from tailoring to streetwear.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-mono text-[rgba(245,245,245,0.6)]">
              <span className="px-2 py-1 border border-hair-dark">Built for men&apos;s hands</span>
              <span className="px-2 py-1 border border-hair-dark">S–XL fit per set</span>
              <span className="px-2 py-1 border border-hair-dark">Up to 7+ days</span>
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <span className="cap cap-dark">Shop</span>
            <ul className="mt-4 space-y-2 text-[14px]">
              <li><a href="/collections/the-essentials" className="ulink">Starter Sets</a></li>
              <li><a href="/collections/minimalist-matte" className="ulink">Stealth Edit</a></li>
              <li><a href="/collections/geometric-grit" className="ulink">Architectural Edit</a></li>
              <li><a href="/collections/night-out-bold" className="ulink">High-Signal Edit</a></li>
              <li><a href="/shop" className="ulink">Accessories</a></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <span className="cap cap-dark">Learn</span>
            <ul className="mt-4 space-y-2 text-[14px]">
              <li><a href="/#fit" className="ulink">Fit System</a></li>
              <li><a href="/#application" className="ulink">Application</a></li>
              <li><a href="/about" className="ulink">About</a></li>
              <li><a href="/lookbook" className="ulink">Lookbook</a></li>
              <li><a href="/journal" className="ulink">Journal</a></li>
              <li><a href="/faq" className="ulink">FAQ</a></li>
            </ul>
          </div>
          <div className="col-span-12 md:col-span-3">
            <span className="cap cap-dark">Contact</span>
            <ul className="mt-4 space-y-2 text-[14px]">
              <li><a href="mailto:hello@nailismo.com" className="ulink">hello@nailismo.com</a></li>
              <li><a href="#" className="ulink">Instagram · @nailismo</a></li>
              <li><a href="#" className="ulink">TikTok · @nailismo</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-hair-dark flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] tracking-[0.22em] uppercase font-mono text-[rgba(245,245,245,0.6)]">
          <a href="/policies/shipping" className="ulink">Shipping</a>
          <a href="/policies/returns" className="ulink">Returns</a>
          <a href="/policies/privacy" className="ulink">Privacy</a>
          <a href="/policies/terms" className="ulink">Terms</a>
          <a href="/contact" className="ulink">Contact</a>
        </div>

        <div className="mt-6 pt-6 border-t border-hair-dark flex flex-wrap items-center justify-between gap-3 text-[11px] tracking-[0.22em] uppercase font-mono text-[rgba(245,245,245,0.55)]">
          <span>© Nailismo 2026 · Wear Your Edge</span>
          <span>Press-On Manicures · Designed for Men&apos;s Hands</span>
          <span>Nippon palette · 茜 · 鉄黒 · 鳥子 · 利休鼠</span>
        </div>
      </div>
    </footer>
  );
}
