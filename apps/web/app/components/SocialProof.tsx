type Tile = {
  src: string;
  alt: string;
  handle: string;
  label: string;
  imgStyle?: React.CSSProperties;
  overlayStyle?: React.CSSProperties;
};

const tiles: Tile[] = [
  {
    src: "/images/website/1218452907.jpg",
    alt: "Hands stretched out showing natural nails before applying a Nailismo set",
    handle: "@ leon.k",
    label: "N°00 · Before The Set",
    imgStyle: { filter: "grayscale(0.85) sepia(0.18) brightness(0.95) contrast(1.05)" },
    overlayStyle: undefined,
  },
  {
    src: "/images/website/8cbcbb5c024edeb13b3042401816d36a.jpg",
    alt: "Man in glasses holding hands to face showing matte black graphic press-on nails",
    handle: "@ s.haru",
    label: "N°02 · Architectural",
    overlayStyle: {
      background:
        "linear-gradient(to top, rgba(40,26,20,0.78) 0%, rgba(40,26,20,0.40) 40%, rgba(40,26,20,0.18) 100%)",
    },
  },
  {
    src: "/images/website/157396244.jpg",
    alt: "Close-up of male hands wearing minimalist matte black architectural press-on nails on brick wall",
    handle: "@ d.alvarez",
    label: "N°03 · Concrete Clarity",
    overlayStyle: {
      background:
        "linear-gradient(to top, rgba(40,26,20,0.78) 0%, rgba(40,26,20,0.40) 40%, rgba(40,26,20,0.18) 100%)",
    },
  },
  {
    src: "/images/website/185268712.jpg",
    alt: "Detail of male hand wearing minimalist matte black geometric press-on nails",
    handle: "@ kj.studio",
    label: "N°02 · Graphic Black",
    overlayStyle: {
      background:
        "linear-gradient(to top, rgba(40,26,20,0.78) 0%, rgba(40,26,20,0.40) 40%, rgba(40,26,20,0.18) 100%)",
    },
  },
];

export function SocialProof() {
  return (
    <section className="bg-toriko sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">N°12</span>
              <span className="cap">Social Proof</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              Men are already
              <br />
              styling their <span className="italic font-serif font-light">hands</span>
              <span className="text-akane">.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col justify-end">
            <p className="text-rikyu max-w-[360px]">
              From office desks to nightclubs, the manicure is becoming part of the modern male uniform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <figure className="col-span-12 md:col-span-4 row-span-2 border border-hair bg-paper p-8 flex flex-col justify-between min-h-[420px]">
            <span className="font-serif italic text-[96px] leading-none text-akane">&ldquo;</span>
            <blockquote className="font-serif italic text-[22px] md:text-[26px] leading-[1.25] tracking-normal">
              I thought it would feel too loud. Galaxy Glitch ended up looking like a watch or ring detail. Subtle, but people noticed.
            </blockquote>
            <figcaption className="mt-6 flex items-center justify-between cap">
              <span>— M.K. / Brooklyn</span>
              <span>Architectural Edit</span>
            </figcaption>
          </figure>

          {tiles.map((t, i) => (
            <a
              key={i}
              href="#"
              className="col-span-6 md:col-span-4 relative aspect-[4/5] overflow-hidden border border-hair look-card"
            >
              <img src={t.src} alt={t.alt} style={t.imgStyle} />
              <div
                className={`look-overlay absolute inset-0 flex flex-col justify-between p-5 ${
                  t.overlayStyle ? "" : "bg-gradient-to-t from-[rgba(40,26,20,0.65)] via-[rgba(40,26,20,0.22)] to-transparent"
                }`}
                style={t.overlayStyle}
              >
                <span className="cap cap-dark">{t.handle}</span>
                <span className="cap cap-dark">{t.label}</span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
          <span className="cap">Tag #nailismo · #wearyouredge</span>
          <a href="#" className="ulink text-[12px] tracking-[0.18em] uppercase font-medium">
            See the full feed →
          </a>
        </div>
      </div>
    </section>
  );
}
