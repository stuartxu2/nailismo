import Image from "next/image";

// Real-hands proof strip — generated UGC-style shots spanning skin tones,
// masc/femme/neutral styling, short + expressive looks. We show diversity
// rather than claiming it. Used on PDP and collection pages.
const SHOTS = [
  { src: "/images/ugc/ugc-1.avif", alt: "Deep skin-tone hand with short glossy black press-on nails and white drip art, mirror selfie" },
  { src: "/images/ugc/ugc-5.avif", alt: "Tattooed hand with short nude press-on nails and minimalist black symbol art — moon, dots, arrow" },
  { src: "/images/ugc/ugc-3.avif", alt: "Fair skin hand throwing a peace sign with glossy cherry-red press-on nails" },
  { src: "/images/ugc/ugc-8.avif", alt: "Deep skin-tone hands showing cream and grey press-on nails with hand-drawn doodle faces" },
  { src: "/images/ugc/ugc-7.avif", alt: "Hands held up showing blue agate marble press-on nails" },
  { src: "/images/ugc/ugc-2.avif", alt: "Light-medium skin hand with a playful mixed press-on set — daisy, crown and gem nails" },
  { src: "/images/ugc/ugc-11.avif", alt: "Hands showing a mismatched multi-color press-on set — blue, red, yellow and dotted nails" },
  { src: "/images/ugc/ugc-10.avif", alt: "Hands with amber and cream marble press-on nails and a gold accent" },
  { src: "/images/ugc/ugc-4.avif", alt: "Medium-deep skin hand with short, minimal silver chrome press-on nails" },
  { src: "/images/ugc/ugc-9.avif", alt: "Hands held up showing green checkered and abstract press-on nails" },
  { src: "/images/ugc/ugc-6.avif", alt: "Hands around a mug showing holiday press-on nails — Santa, snowman and green check" },
];

export function UgcStrip({ heading = "Worn loud. Worn minimal." }: { heading?: string }) {
  return (
    <section aria-label="Real hands wearing Nailismo" style={{ marginTop: 8 }}>
      <span className="candy-eyebrow">Real hands</span>
      <h2 style={{ marginTop: 8, fontSize: "clamp(22px,3vw,30px)" }}>{heading}</h2>
      <p style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "var(--ink-soft)" }}>
        Short, long, masc, femme, expressive — styled on every kind of hand.
      </p>
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {SHOTS.map((s) => (
          <div
            key={s.src}
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "var(--shadow-candy)",
            }}
          >
            <Image src={s.src} alt={s.alt} fill sizes="(max-width:640px) 50vw, 200px" style={{ objectFit: "cover" }} />
          </div>
        ))}
      </div>
    </section>
  );
}
