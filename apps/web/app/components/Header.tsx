import Link from "next/link";
import Image from "next/image";
import { MobileMenu } from "./MobileMenu";
import { getCart } from "@/lib/shopify/cart";

const NAV = [
  { href: "/collections/new-drops", label: "New" },
  { href: "/shop", label: "Sets" },
  { href: "/collections/best-sellers", label: "Best Sellers" },
  { href: "/fit", label: "Fit" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/about", label: "About" },
];

export async function Header() {
  const cart = await getCart();
  const count = cart?.totalQuantity ?? 0;
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
          {NAV.map((n) => (
            <Link key={n.label} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/products/nailismo-gift-card" className="candy-gift-link">
            <span className="pop" aria-hidden>🎁</span> Gift Card
          </Link>
        </nav>

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
          <Link href="/cart" className="candy-btn is-soda" style={{ padding: "10px 18px", fontSize: 14 }} aria-label={`Cart, ${count} items`}>
            Cart
            <span
              aria-hidden
              style={{
                display: "inline-grid",
                placeItems: "center",
                minWidth: 22,
                height: 22,
                padding: "0 6px",
                borderRadius: 999,
                background: "var(--bubblegum)",
                color: "var(--ink)",
                border: "2px solid var(--ink)",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              {count}
            </span>
          </Link>
          <MobileMenu count={count} />
        </div>
      </div>
    </header>
  );
}
