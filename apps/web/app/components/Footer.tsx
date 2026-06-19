import Link from "next/link";
import Image from "next/image";

const PAYMENTS = ["Apple Pay", "Google Pay", "Shop Pay", "PayPal", "Klarna"];

const SOCIAL = [
  { label: "Instagram", href: "https://instagram.com/shopnailismo", path: "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.15-3.23 1.66-4.77 4.92-4.92C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.15 0-3.52.01-4.76.07-2.4.11-3.66 1.4-3.77 3.77-.06 1.24-.07 1.6-.07 4.76s.01 3.52.07 4.76c.11 2.37 1.37 3.66 3.77 3.77 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c2.4-.11 3.66-1.4 3.77-3.77.06-1.24.07-1.6.07-4.76s-.01-3.52-.07-4.76c-.11-2.37-1.37-3.66-3.77-3.77-1.24-.06-1.61-.07-4.76-.07zM12 6.87a5.13 5.13 0 100 10.26 5.13 5.13 0 000-10.26zm0 8.46a3.33 3.33 0 110-6.66 3.33 3.33 0 010 6.66zm5.34-9.87a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" },
  { label: "TikTok", href: "https://tiktok.com/@shopnailismo", path: "M12.53 2.01c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
  { label: "X", href: "https://x.com/shopnailismo", path: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z" },
  { label: "Pinterest", href: "https://pinterest.com/shopnailismo", path: "M12.02 0C5.4 0 .03 5.37.03 11.99c0 5.08 3.16 9.42 7.62 11.16-.11-.95-.2-2.4.04-3.44.22-.94 1.41-5.96 1.41-5.96s-.36-.72-.36-1.78c0-1.66.97-2.91 2.17-2.91 1.02 0 1.52.77 1.52 1.69 0 1.03-.65 2.57-.99 3.99-.29 1.19.6 2.17 1.77 2.17 2.13 0 3.77-2.25 3.77-5.49 0-2.86-2.06-4.87-5.01-4.87-3.41 0-5.41 2.56-5.41 5.2 0 1.03.39 2.14.89 2.74.1.12.11.22.08.35-.09.37-.29 1.2-.33 1.36-.05.22-.17.27-.4.16-1.5-.69-2.43-2.88-2.43-4.65 0-3.78 2.75-7.25 7.92-7.25 4.16 0 7.39 2.97 7.39 6.92 0 4.14-2.61 7.46-6.23 7.46-1.21 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15 1.12.35 2.32.53 3.55.53 6.62 0 11.99-5.37 11.99-11.99C24 5.37 18.64 0 12.02 0z" },
];

function Col({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 16, color: "var(--lemon)", marginBottom: 12 }}>{title}</h4>
      <ul style={{ display: "flex", flexDirection: "column", gap: 9, listStyle: "none", padding: 0, margin: 0 }}>
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} style={{ fontSize: 14, fontWeight: 600, color: "rgba(230,213,235,0.78)" }}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer style={{ background: "var(--ink)", color: "var(--cotton)", borderTop: "2.5px solid var(--ink)" }}>
      <div className="candy-wrap" style={{ paddingBlock: 56 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 30, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 320 }}>
            <Image
              src="/images/logo/nailismo-wordmark-light.avif"
              alt="Nailismo — press on, show off"
              width={185}
              height={46}
              style={{ height: 46, width: "auto" }}
            />
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(230,213,235,0.7)", marginTop: 12 }}>
              Press-on nails that are pure fun. Ready in minutes, clean to remove. Press on. Show off.
            </p>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Ready in minutes", "S–XL fit", "Clean removal"].map((t) => (
                <span key={t} style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 11, padding: "5px 10px", borderRadius: 999, background: "rgba(230,213,235,0.12)" }}>{t}</span>
              ))}
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`Nailismo on ${s.label}`} className="candy-soc">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
                </a>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <Col title="Shop" links={[
              { label: "New Drops", href: "/collections/new-drops" },
              { label: "Best Sellers", href: "/collections/best-sellers" },
              { label: "Wairo 和色", href: "/collections/wairo" },
              { label: "Shop All", href: "/shop" },
            ]} />
            <Col title="Learn" links={[
              { label: "Fit Guide", href: "/fit" },
              { label: "About", href: "/about" },
              { label: "Lookbook", href: "/lookbook" },
              { label: "Journal", href: "/journal" },
              { label: "FAQ", href: "/faq" },
            ]} />
            <Col title="Help" links={[
              { label: "Shipping", href: "/policies/shipping" },
              { label: "Returns & Refunds", href: "/policies/returns" },
              { label: "Legal Notice", href: "/policies/legal-notice" },
              { label: "Contact", href: "/contact" },
              { label: "hello@nailismo.com", href: "mailto:hello@nailismo.com" },
            ]} />
          </div>
        </div>
        <div style={{ borderTop: "1.5px solid rgba(230,213,235,0.18)", marginTop: 40, paddingTop: 22, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(230,213,235,0.6)" }}>© {new Date().getFullYear()} Nailismo</span>
            <Link href="/policies/terms" style={{ fontSize: 13, fontWeight: 600, color: "rgba(230,213,235,0.7)" }}>Terms of Service</Link>
            <Link href="/policies/privacy" style={{ fontSize: 13, fontWeight: 600, color: "rgba(230,213,235,0.7)" }}>Privacy Policy</Link>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PAYMENTS.map((p) => (
              <span key={p} style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 11, padding: "5px 10px", borderRadius: 999, background: "rgba(230,213,235,0.12)" }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
