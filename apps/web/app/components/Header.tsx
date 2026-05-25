import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import { getCart } from "@/lib/shopify/cart";

export async function Header() {
  const cart = await getCart();
  const count = cart?.totalQuantity ?? 0;
  return (
    <header className="sticky top-0 z-50 bg-[rgba(245,245,245,0.85)] backdrop-blur-md border-b border-hair">
      <div className="nail-container flex items-center justify-between h-[72px]">
        <Link href="/" className="flex items-center gap-3" aria-label="Nailismo home">
          <img src="/images/logo/01.avif" alt="Nailismo" className="h-9 logo-natural" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[12px] tracking-[0.18em] uppercase font-medium text-tetsu">
          <Link href="/shop" className="ulink">New</Link>
          <Link href="/shop" className="ulink">Sets</Link>
          <Link href="/shop" className="ulink">Best Sellers</Link>
          <Link href="/fit" className="ulink">Fit</Link>
          <Link href="/lookbook" className="ulink">Lookbook</Link>
          <Link href="/about" className="ulink">About</Link>
        </nav>
        <div className="flex items-center gap-4 md:gap-5 text-[12px] tracking-[0.18em] uppercase font-medium">
          <Link href="/search" className="flex items-center ulink" aria-label="Search">
            <svg
              className="md:hidden w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <span className="hidden md:inline">Search</span>
          </Link>
          <Link href="/account" className="flex items-center ulink" aria-label="Account">
            <svg
              className="md:hidden w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
            </svg>
            <span className="hidden md:inline">Account</span>
          </Link>
          <Link href="/cart" className="ulink" aria-label="Cart">
            <span className="flex items-center gap-2">
              <svg
                className="md:hidden w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6.5 8h11l-1 11.5h-9L6.5 8z" />
                <path d="M9.2 8V6.8a2.8 2.8 0 0 1 5.6 0V8" />
              </svg>
              <span className="hidden md:inline">Cart</span>
              <span className="font-mono text-[10px] border border-[var(--hair-strong)] px-1.5 py-0.5">
                {count}
              </span>
            </span>
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
