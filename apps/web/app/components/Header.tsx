import { MobileMenu } from "./MobileMenu";
import { getCart } from "@/lib/shopify/cart";

export async function Header() {
  const cart = await getCart();
  const count = cart?.totalQuantity ?? 0;
  return (
    <header className="sticky top-0 z-50 bg-[rgba(245,245,245,0.85)] backdrop-blur-md border-b border-hair">
      <div className="nail-container flex items-center justify-between h-[72px]">
        <a href="/" className="flex items-center gap-3" aria-label="Nailismo home">
          <img src="/images/logo/01.png" alt="Nailismo" className="h-9 logo-natural" />
        </a>
        <nav className="hidden md:flex items-center gap-8 text-[12px] tracking-[0.18em] uppercase font-medium text-tetsu">
          <a href="/shop" className="ulink">Shop</a>
          <a href="/#starter-gateway" className="ulink">Starter Sets</a>
          <a href="/#edits" className="ulink">Style Edits</a>
          <a href="/#fit" className="ulink">Fit Guide</a>
          <a href="/lookbook" className="ulink">Lookbook</a>
          <a href="/journal" className="ulink">Journal</a>
          <a href="/faq" className="ulink">FAQ</a>
        </nav>
        <div className="flex items-center gap-4 md:gap-5 text-[12px] tracking-[0.18em] uppercase font-medium">
          <a href="/search" className="hidden sm:inline ulink" aria-label="Search">Search</a>
          <a href="/account" className="hidden sm:inline ulink">Account</a>
          <a href="/cart" className="flex items-center gap-2 ulink">
            Cart{" "}
            <span className="font-mono text-[10px] border border-[var(--hair-strong)] px-1.5 py-0.5">
              {count}
            </span>
          </a>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
