import Link from "next/link";
import Image from "next/image";
import { MobileMenu } from "./MobileMenu";
import { CartCountProvider, CartBadge } from "./CartCount";
import { FavLink } from "./FavCount";
import { getMenuCollections } from "@/lib/shopify/collections";

export async function Header() {
  const collections = await getMenuCollections();
  return (
    <header className="candy-head">
      <div className="candy-wrap flex items-center justify-between h-[70px]">
        <Link href="/" aria-label="Nailismo home" style={{ display: "inline-flex", alignItems: "center" }}>
          <Image
            src="/images/logo/nailismo-wordmark.avif"
            alt="Nailismo — press on, show off"
            width={161}
            height={40}
            priority
            style={{ height: 40, width: "auto" }}
          />
        </Link>

        <nav className="candy-nav" style={{ gap: 4 }}>
          <div className="candy-navdrop">
            <Link href="/shop" className="candy-navdrop-trigger">
              Shop
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Link>
            <div className="candy-dropdown">
              <div className="candy-dropdown-inner">
                {collections.map((c) => (
                  <Link key={c.handle} href={`/collections/${c.handle}`}>
                    {c.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link href="/collections/new-drops">New</Link>
          <Link href="/fit" className="candy-fit-link">
            <span className="pop" aria-hidden>📏</span> Fit
          </Link>
          <Link href="/lookbook">Lookbook</Link>
          <Link href="/products/nailismo-gift-card" className="candy-gift-link">
            <span className="pop" aria-hidden>🎁</span> Gift Card
          </Link>
        </nav>

        <CartCountProvider>
        <div className="flex items-center gap-2.5">
          <Link href="/search" className="candy-iconbtn candy-md-only" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </Link>
          <Link href="/account" className="candy-iconbtn candy-md-only" aria-label="Account">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
            </svg>
          </Link>
          <FavLink />
          <Link href="/cart" className="candy-btn is-soda" style={{ padding: "10px 18px", fontSize: 14 }} aria-label="Cart">
            Cart
            <CartBadge />
          </Link>
          <MobileMenu />
        </div>
        </CartCountProvider>
      </div>
    </header>
  );
}
