import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { LOOKS, getLook } from "../data";

type Params = { handle: string };

export async function generateStaticParams(): Promise<Params[]> {
  return LOOKS.map((l) => ({ handle: l.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const look = getLook(handle);
  if (!look) return { title: "Look Not Found · Nailismo" };
  return {
    title: `${look.title} · Lookbook · Nailismo`,
    description: look.desc,
    alternates: { canonical: `/lookbook/${look.handle}` },
    openGraph: {
      title: `${look.title} · Lookbook · Nailismo`,
      description: look.desc,
      images: [{ url: look.src }],
      type: "article",
    },
  };
}

export default async function LookPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const look = getLook(handle);
  if (!look) notFound();

  const related = look.related
    .map((h) => getLook(h))
    .filter((l): l is NonNullable<ReturnType<typeof getLook>> => Boolean(l));

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <Link href="/lookbook" className="candy-crumb">Lookbook</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>{look.title}</span>
        </nav>

        <div className="candy-pagehead" style={{ marginBottom: 24 }}>
          <span className="candy-eyebrow">Look {look.num}</span>
          <h1 style={{ marginTop: 10, fontSize: "clamp(44px,7vw,96px)" }}>{look.title}</h1>
          <p>{look.desc}</p>
        </div>

        <div style={{ position: "relative", aspectRatio: "16/8", borderRadius: 28, overflow: "hidden", border: "2.5px solid var(--ink)", boxShadow: "var(--shadow-candy)" }}>
          { }
          <img src={look.src} alt={look.alt} className="img-cover" />
        </div>

        <section className="grid grid-cols-12 gap-8 md:gap-10" style={{ marginTop: 48 }}>
          <div className="col-span-12 md:col-span-5">
            <span className="candy-eyebrow">The read</span>
            <p style={{ fontFamily: "var(--display)", fontSize: "clamp(24px,3vw,32px)", lineHeight: 1.15, marginTop: 12 }}>{look.story}</p>
          </div>
          <div className="col-span-12 md:col-span-7">
            <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Outfit breakdown</span>
            <dl>
              {look.outfit.map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "14px 0", borderBottom: "2px solid var(--marshmallow)" }}>
                  <dt className="candy-eyebrow" style={{ flex: "none" }}>{row.label}</dt>
                  <dd style={{ fontWeight: 700, textAlign: "right" }}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section style={{ marginTop: 48 }}>
          <div style={{ background: "var(--ink)", color: "var(--cotton)", borderRadius: 28, padding: "clamp(28px,4vw,48px)", display: "grid", gridTemplateColumns: "1fr", gap: 20 }} className="md:grid-cols-[1.4fr_0.6fr] md:items-center">
            <div>
              <span className="candy-eyebrow" style={{ color: "var(--lemon)" }}>The pairing</span>
              <h2 style={{ fontSize: "clamp(28px,4vw,44px)", marginTop: 8 }}>{look.pairing.set}</h2>
              <p style={{ marginTop: 12, fontWeight: 600, color: "rgba(230,213,235,0.8)", maxWidth: 480 }}>{look.pairing.note}</p>
            </div>
            <div className="md:flex md:justify-end">
              <Link href={`/product/${look.pairing.productHandle}`} className="candy-btn">Shop the set <span className="pop" aria-hidden>🛍️</span></Link>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
              <h3 style={{ fontSize: "clamp(26px,4vw,40px)" }}>Other looks</h3>
              <Link href="/lookbook" className="candy-btn is-ghost" style={{ padding: "10px 18px", fontSize: 14 }}>View all</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {related.map((l) => (
                <Link
                  key={l.handle}
                  href={`/lookbook/${l.handle}`}
                  className="look-card block"
                  style={{ position: "relative", aspectRatio: "4/5", borderRadius: 28, overflow: "hidden", border: "2.5px solid var(--ink)", boxShadow: "var(--shadow-candy)" }}
                >
                  { }
                  <img src={l.src} alt={l.alt} />
                  <div
                    className="look-overlay absolute inset-0 flex flex-col justify-between p-7"
                    style={{ background: "linear-gradient(to top, rgba(39,16,40,0.92) 0%, rgba(39,16,40,0.5) 45%, rgba(39,16,40,0.2) 100%)" }}
                  >
                    <div><span className="candy-sticker is-gum">{l.num}</span></div>
                    <div>
                      <h4 style={{ fontFamily: "var(--display)", fontSize: "clamp(30px,3.4vw,44px)", lineHeight: 0.98, color: "var(--cotton)" }}>{l.title}</h4>
                      <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "rgba(230,213,235,0.9)", maxWidth: 360 }}>{l.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
