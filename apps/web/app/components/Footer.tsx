import Link from "next/link";
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
              <li><Link href="/collections/the-essentials" className="ulink">Starter Sets</Link></li>
              <li><Link href="/collections/minimalist-matte" className="ulink">Stealth Edit</Link></li>
              <li><Link href="/collections/geometric-grit" className="ulink">Architectural Edit</Link></li>
              <li><Link href="/collections/night-out-bold" className="ulink">High-Signal Edit</Link></li>
              <li><Link href="/shop" className="ulink">Accessories</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <span className="cap cap-dark">Learn</span>
            <ul className="mt-4 space-y-2 text-[14px]">
              <li><Link href="/#fit" className="ulink">Fit System</Link></li>
              <li><Link href="/#application" className="ulink">Application</Link></li>
              <li><Link href="/about" className="ulink">About</Link></li>
              <li><Link href="/lookbook" className="ulink">Lookbook</Link></li>
              <li><Link href="/journal" className="ulink">Journal</Link></li>
              <li><Link href="/faq" className="ulink">FAQ</Link></li>
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
          <Link href="/policies/shipping" className="ulink">Shipping</Link>
          <Link href="/policies/returns" className="ulink">Returns</Link>
          <Link href="/policies/privacy" className="ulink">Privacy</Link>
          <Link href="/policies/terms" className="ulink">Terms</Link>
          <Link href="/contact" className="ulink">Contact</Link>
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
