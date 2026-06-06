import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LOOKS, getLook } from "../data";

type Params = { handle: string };

const feedSrc = (n: number) => `/images/lookbook/collage/feed-${String(n).padStart(3, "0")}.avif`;

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

  // double the feed for a dense, "mass" collage wall
  const tiles = [...look.feed, ...[...look.feed].reverse()];

  return (
    <>
      <main className="candy-wrap" style={{ position: "relative", paddingTop: 28 }}>
        {/* atmosphere */}
        <div className="candy-blob" aria-hidden style={{ width: 340, height: 340, background: "var(--lemon)", top: -40, right: -70 }} />
        <div className="candy-blob" aria-hidden style={{ width: 280, height: 280, background: "var(--grape)", top: 220, left: -90 }} />

        {/* breadcrumb */}
        <nav style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <Link href="/lookbook" className="candy-crumb">Lookbook</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>{look.title}</span>
        </nav>

        {/* HERO */}
        <section className="lb-detail-hero candy-rise" style={{ position: "relative", zIndex: 1 }}>
          <div className="lb-hero-art">
            { }
            {look.videoSrc ? (
              <video
                src={look.videoSrc}
                poster={look.poster ?? look.src}
                autoPlay
                muted
                loop
                playsInline
                aria-label={look.alt}
              />
            ) : (
              <img src={look.src} alt={look.alt} />
            )}
            <span className="lb-num" style={{ position: "absolute", top: 16, left: 16 }}>{look.num}</span>
            <span className="candy-sticker is-soda" style={{ position: "absolute", bottom: 18, right: 16, color: "var(--cream)" }}>{look.tag}</span>
          </div>

          <div>
            <span className="candy-eyebrow">Look {look.num}</span>
            <h1 className="lb-display" style={{ fontSize: "clamp(44px,8vw,108px)", marginTop: 12 }}>{look.title}</h1>
            <p style={{ marginTop: 18, fontSize: 17, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 460 }}>{look.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
              <Link href={`/product/${look.pairing.productHandle}`} className="candy-btn">
                Shop {look.pairing.set} <span className="pop" aria-hidden>🛍️</span>
              </Link>
              <a href="#feed" className="candy-btn is-ghost">See it worn ↓</a>
            </div>
          </div>
        </section>

        {/* THE READ + OUTFIT */}
        <section className="grid grid-cols-12 gap-8 md:gap-10" style={{ marginTop: "clamp(48px,7vw,80px)", position: "relative", zIndex: 1 }}>
          <div className="col-span-12 md:col-span-5">
            <span className="candy-eyebrow">The read</span>
            <p style={{ fontFamily: "var(--display)", fontSize: "clamp(24px,3vw,34px)", lineHeight: 1.14, marginTop: 12 }}>{look.story}</p>
          </div>
          <div className="col-span-12 md:col-span-7">
            <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>The fit, broken down</span>
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

        {/* MASS SOCIAL COLLAGE */}
        <section id="feed" style={{ marginTop: "clamp(56px,8vw,96px)", position: "relative", zIndex: 1, scrollMarginTop: 90 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
            <div>
              <span className="candy-eyebrow">Straight off the feed</span>
              <h2 style={{ fontSize: "clamp(30px,5vw,54px)", marginTop: 8 }}>How they're <span className="lb-hl">wearing it</span></h2>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)", maxWidth: 300 }}>
              Real hands from the 小红书 · RedNote <em>男生美甲</em> feed — plus one of ours in motion.
            </p>
          </div>

          <div className="lb-collage">
            {/* our own clip — honestly tagged */}
            <div className="lb-tile is-video">
              { }
              <video
                src="/videos/hero-cloud-nails.mp4"
                poster={look.src}
                autoPlay
                muted
                loop
                playsInline
                aria-label={`${look.title} nails in motion`}
              />
              <span className="lb-play" aria-hidden><span>▶</span></span>
              <span className="lb-tile-tag">▶ clip</span>
              <span className="lb-tile-src">@nailismo</span>
            </div>

            {tiles.map((n, i) => (
              <div className="lb-tile" key={`${n}-${i}`}>
                { }
                <img src={feedSrc(n)} alt={`${look.title} nail inspiration from the RedNote feed`} loading="lazy" />
                <span className="lb-tile-src">小红书</span>
              </div>
            ))}
          </div>
        </section>

        {/* PAIRING */}
        <section style={{ marginTop: "clamp(48px,7vw,72px)", position: "relative", zIndex: 1 }}>
          <div style={{ background: "var(--ink)", color: "var(--cotton)", borderRadius: 28, padding: "clamp(28px,4vw,48px)", display: "grid", gridTemplateColumns: "1fr", gap: 20, position: "relative", overflow: "hidden", boxShadow: "var(--shadow-pop)" }} className="md:grid-cols-[1.4fr_0.6fr] md:items-center">
            <div className="candy-blob" aria-hidden style={{ width: 240, height: 240, background: "var(--bubblegum)", top: -70, right: -30, opacity: 0.3 }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className="candy-eyebrow" style={{ color: "var(--lemon)" }}>The pairing</span>
              <h2 style={{ fontSize: "clamp(28px,4vw,46px)", marginTop: 8 }}>{look.pairing.set}</h2>
              <p style={{ marginTop: 12, fontWeight: 600, color: "rgba(230,213,235,0.82)", maxWidth: 480 }}>{look.pairing.note}</p>
            </div>
            <div className="md:flex md:justify-end" style={{ position: "relative", zIndex: 1 }}>
              <Link href={`/product/${look.pairing.productHandle}`} className="candy-btn">Shop the set <span className="pop" aria-hidden>🛍️</span></Link>
            </div>
          </div>
        </section>

        {/* RELATED */}
        {related.length > 0 && (
          <section style={{ marginTop: "clamp(56px,8vw,88px)", paddingBottom: "clamp(64px,9vw,120px)", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
              <h3 style={{ fontSize: "clamp(26px,4vw,42px)" }}>More looks to swipe</h3>
              <Link href="/lookbook" className="candy-btn is-ghost" style={{ padding: "10px 18px", fontSize: 14 }}>View all</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {related.map((l) => (
                <Link key={l.handle} href={`/lookbook/${l.handle}`} className="lb-card">
                  { }
                  <img src={l.src} alt={l.alt} loading="lazy" />
                  <div className="lb-card-grad">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <span className="lb-num">{l.num}</span>
                      <span className="lb-kick">{l.tag}</span>
                    </div>
                    <div>
                      <h4 className="lb-card-title" style={{ fontSize: "clamp(30px,3.4vw,46px)" }}>{l.title}</h4>
                      <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "rgba(230,213,235,0.92)", maxWidth: 360 }}>{l.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
