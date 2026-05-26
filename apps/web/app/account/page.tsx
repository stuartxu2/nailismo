import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Account · Nailismo",
  description:
    "Sign in to your Nailismo account. Track orders, manage addresses, reorder favorites.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: true },
};

const shopDomain = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const loginUrl = shopDomain ? `https://${shopDomain}/account/login` : "#";
const registerUrl = shopDomain ? `https://${shopDomain}/account/register` : "#";
const ordersUrl = shopDomain ? `https://${shopDomain}/account/orders` : "#";

export default function AccountPage() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Account</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Members</span>
          <h1 style={{ marginTop: 10 }}>Your account</h1>
          <p>Sign-in, order history, and addresses run on Shopify&apos;s secure portal — the same login works at checkout.</p>
        </div>

        <div className="grid grid-cols-12 gap-6" style={{ marginTop: 40 }}>
          <div className="col-span-12 md:col-span-6" style={{ background: "var(--cream)", border: "2.5px solid var(--ink)", borderRadius: 24, padding: 28, boxShadow: "var(--shadow-candy)" }}>
            <span className="candy-eyebrow">Returning</span>
            <h2 style={{ fontSize: 28, marginTop: 8 }}>Already have an account?</h2>
            <p style={{ marginTop: 10, fontWeight: 600, color: "var(--ink-soft)" }}>Pull up past orders, addresses, and saved sets.</p>
            <a href={loginUrl} className="candy-btn" style={{ marginTop: 22 }}>Sign in <span className="pop" aria-hidden>→</span></a>
          </div>
          <div className="col-span-12 md:col-span-6" style={{ background: "var(--cream)", border: "2.5px solid var(--ink)", borderRadius: 24, padding: 28, boxShadow: "var(--shadow-candy)" }}>
            <span className="candy-eyebrow">New here</span>
            <h2 style={{ fontSize: 28, marginTop: 8 }}>First time?</h2>
            <p style={{ marginTop: 10, fontWeight: 600, color: "var(--ink-soft)" }}>Make an account in 30 seconds — faster checkout, tracking, early access to drops.</p>
            <a href={registerUrl} className="candy-btn is-ghost" style={{ marginTop: 22 }}>Create account</a>
          </div>
        </div>

        <div style={{ marginTop: 24, background: "var(--cream)", border: "2.5px solid var(--ink)", borderRadius: 24, padding: 28, boxShadow: "var(--shadow-candy)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ maxWidth: 520 }}>
            <span className="candy-eyebrow">Order lookup</span>
            <h3 style={{ fontSize: 22, marginTop: 8 }}>Guest checkout? Track via the link in your confirmation email — or sign in to see everything in one place.</h3>
          </div>
          <a href={ordersUrl} className="candy-btn is-ghost">Open orders</a>
        </div>
      </main>
      <Footer />
    </>
  );
}
