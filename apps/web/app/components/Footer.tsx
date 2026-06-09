import Link from "next/link";
import Image from "next/image";

const PAYMENTS = ["Apple Pay", "Google Pay", "Shop Pay", "PayPal", "Klarna"];

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
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <Col title="Shop" links={[
              { label: "New Drops", href: "/collections/new-drops" },
              { label: "Best Sellers", href: "/collections/best-sellers" },
              { label: "Chrome Club", href: "/collections/chrome-club" },
              { label: "Loud & Graphic", href: "/collections/loud-and-graphic" },
              { label: "Latte & Neutrals", href: "/collections/latte-and-neutrals" },
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
              { label: "Terms of Service", href: "/policies/terms" },
              { label: "Legal Notice", href: "/policies/legal-notice" },
              { label: "Contact", href: "/contact" },
              { label: "hello@nailismo.com", href: "mailto:hello@nailismo.com" },
            ]} />
          </div>
        </div>
        <div style={{ borderTop: "1.5px solid rgba(230,213,235,0.18)", marginTop: 40, paddingTop: 22, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(230,213,235,0.6)" }}>© {new Date().getFullYear()} Nailismo</span>
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
