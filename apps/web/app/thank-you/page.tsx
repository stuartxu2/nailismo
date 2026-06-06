import Link from "next/link";
import type { Metadata } from "next";
import { ClearCartOnMount } from "./ClearCartOnMount";
export const metadata: Metadata = {
  title: "Order Confirmed · Nailismo",
  description: "Order received. What happens next.",
  alternates: { canonical: "/thank-you" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

type SearchParams = { order?: string; email?: string };

const NEXT_STEPS = [
  { num: "01", emoji: "📧", label: "Confirmation email", body: "Receipt and tracking link land in your inbox within minutes. Check spam if it doesn't show." },
  { num: "02", emoji: "📦", label: "Ships in 24h", body: "Orders placed before 2pm ET ship the same business day. Tracking starts the moment the label prints." },
  { num: "03", emoji: "💅", label: "Press on with ease", body: "Every set ships with sizing tabs, prep wipes, and a one-page application card. Or watch the 90-second guide." },
];

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { order, email } = await searchParams;

  return (
    <>
      <ClearCartOnMount />
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Confirmation</span>
        </nav>

        <div className="candy-pagehead" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, lineHeight: 1 }} aria-hidden>🎉</div>
          <span className="candy-sticker is-mint" style={{ marginTop: 14 }}>Order placed</span>
          <h1 style={{ marginTop: 16 }}>Thank you!</h1>
          <p style={{ maxWidth: 520, marginInline: "auto" }}>Order received — a confirmation email with tracking is on its way. Your cart clears automatically.</p>
          {(order || email) && (
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {order && <span className="candy-chip" style={{ cursor: "default" }}>Order: {order}</span>}
              {email && <span className="candy-chip" style={{ cursor: "default" }}>Sent to: {email}</span>}
            </div>
          )}
        </div>

        <section style={{ marginTop: 48 }}>
          <span className="candy-eyebrow" style={{ display: "block", marginBottom: 24 }}>What happens next</span>
          <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {NEXT_STEPS.map((s) => (
              <article key={s.num} className="candy-step">
                <div style={{ fontSize: 38 }} aria-hidden>{s.emoji}</div>
                <h3 style={{ fontSize: 22, marginTop: 12 }}>{s.label}</h3>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-soft)", marginTop: 8 }}>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 48 }}>
          <div style={{ background: "var(--ink)", color: "var(--cotton)", borderRadius: 28, padding: "clamp(28px,4vw,48px)", display: "grid", gridTemplateColumns: "1fr", gap: 20 }} className="md:grid-cols-[1.4fr_0.6fr] md:items-center">
            <div>
              <span className="candy-eyebrow" style={{ color: "var(--lemon)" }}>While you wait</span>
              <h2 style={{ fontSize: "clamp(28px,4vw,44px)", marginTop: 8 }}>Pick your next flavor</h2>
              <p style={{ marginTop: 12, fontWeight: 600, color: "rgba(230,213,235,0.8)", maxWidth: 480 }}>Build a little rotation — a daily, a weekend, a statement. Queue up the next two.</p>
            </div>
            <div className="md:flex md:justify-end" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/shop" className="candy-btn">Shop the rack</Link>
              <Link href="/lookbook" className="candy-btn is-ghost" style={{ background: "transparent", color: "var(--cotton)", borderColor: "var(--cotton)" }}>Lookbook</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
