"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeroVideoTile } from "./HeroVideoTile";

function src(path: string): string {
  return path.startsWith("http") ? path : encodeURI(path);
}

const SLIDES = ["candy", "wairo"] as const;
const ADVANCE_MS = 7000;

/* Two-up hero carousel: the evergreen candy intro + a feature slide for the
   新 Wairo 和色 matte series. Crossfades via opacity (grid-stacked so the tallest
   slide sets the height — no layout jump). Auto-advances unless the user hovers,
   focuses inside, or has prefers-reduced-motion set. */
export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Randomize which slide greets each visit. Must run on mount (not in a
    // useState initializer) so SSR/CSR markup matches — the extra render is the
    // price of hydration-safe randomness, so the set-state-in-effect is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe one-shot randomization
    setActive(Math.floor(Math.random() * SLIDES.length));
  }, []);

  const go = useCallback((i: number) => {
    setActive(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused || reduced.current) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % SLIDES.length),
      ADVANCE_MS,
    );
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="candy-hero-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {/* ---- slide 1: candy intro ---- */}
      <section
        className={`candy-hero-slide ${active === 0 ? "is-active" : ""}`}
        aria-hidden={active !== 0}
        aria-roledescription="slide"
        aria-label="Press on. Show off."
        style={{ position: "relative", overflow: "hidden" }}
      >
        <div className="candy-blob" style={{ width: 360, height: 360, background: "var(--bubblegum)", top: -80, left: -60 }} />
        <div className="candy-blob" style={{ width: 300, height: 300, background: "var(--soda)", top: 120, right: -40, animationDelay: "-4s" }} />
        <div className="candy-blob" style={{ width: 240, height: 240, background: "var(--lemon)", bottom: -60, left: "38%", animationDelay: "-7s" }} />

        <div className="candy-wrap" style={{ position: "relative", zIndex: 2, paddingBlock: "clamp(48px, 7vw, 96px)" }}>
          <div style={{ display: "grid", gap: 40, gridTemplateColumns: "1fr", alignItems: "center" }} className="candy-hero-grid">
            <div className="candy-rise">
              <span className="candy-eyebrow">Press-on nails · for every hand</span>
              <h1 style={{ fontSize: "clamp(52px, 9vw, 104px)", marginTop: 18 }}>
                Press on.<br />
                <span style={{ color: "var(--bubblegum-d)" }}>Show</span>{" "}
                <span style={{ color: "var(--grape)" }}>off.</span>
              </h1>
              <p style={{ fontSize: "clamp(17px, 2.2vw, 21px)", fontWeight: 700, color: "var(--ink-soft)", maxWidth: 460, marginTop: 18 }}>
                Bright, collectible nail sets — <strong style={{ color: "var(--ink)" }}>100% hand-painted</strong>, ready in minutes. Easy to wear, easy to remove, impossible to resist.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
                <Link href="/shop" className="candy-btn" tabIndex={active === 0 ? 0 : -1}>Shop the Candy Rack <span className="pop" aria-hidden>🍬</span></Link>
                <Link href="/fit" className="candy-btn is-ghost" tabIndex={active === 0 ? 0 : -1}>Find My Size</Link>
              </div>
            </div>

            <div style={{ position: "relative", minHeight: 420 }} className="candy-hero-art">
              <div className="candy-float d1" style={{ ["--rot" as string]: "-9deg", position: "absolute", bottom: -6, left: "30%", width: "34%", maxWidth: 150, zIndex: 1 }}>
                <HeroTile img="/images/listing/g-dragon press on nails.avif" alt="G-Dragon monochrome press-on nail set" border="var(--bubblegum)" />
              </div>
              <div className="candy-float d3" style={{ ["--rot" as string]: "6deg", position: "absolute", top: 0, right: "-1%", width: "46%", maxWidth: 218, zIndex: 2 }}>
                <HeroTile img="/images/website/hero-festive-nails-model.avif" alt="Model showing off Nailismo press-on nails with festive art" border="var(--lemon)" />
              </div>
              <div className="candy-float d1" style={{ ["--rot" as string]: "7deg", position: "absolute", top: "58%", right: "-1%", width: "34%", maxWidth: 148, zIndex: 2 }}>
                <HeroTile img="/images/listing/christmas press on nails.avif" alt="Hand-painted Christmas press-on nail set" border="var(--grape)" />
              </div>
              <div className="candy-float d2" style={{ ["--rot" as string]: "-4deg", position: "absolute", top: 44, left: "1%", width: "52%", maxWidth: 256, zIndex: 3 }}>
                <HeroVideoTile
                  src="/videos/hero-cloud-nails.mp4"
                  poster="/videos/hero-cloud-nails-poster.avif"
                  alt="Model wearing Nailismo press-on nails with sky-blue cloud art"
                  border="var(--soda)"
                />
              </div>
              <span className="candy-sticker is-gum candy-float" style={{ position: "absolute", top: 6, left: "26%", zIndex: 5, fontSize: 14 }}>
                Ready in minutes!
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- slide 2: Wairo 和色 series ---- */}
      <section
        className={`candy-hero-slide candy-hero-wairo ${active === 1 ? "is-active" : ""}`}
        aria-hidden={active !== 1}
        aria-roledescription="slide"
        aria-label="New series — Wairo 和色"
        style={{ position: "relative", overflow: "hidden" }}
      >
        <div className="candy-blob" style={{ width: 340, height: 340, background: "var(--soda)", top: -70, right: -50 }} />
        <div className="candy-blob" style={{ width: 260, height: 260, background: "var(--marshmallow)", bottom: -50, left: -40, animationDelay: "-5s" }} />

        <div className="candy-wrap" style={{ position: "relative", zIndex: 2, paddingBlock: "clamp(48px, 7vw, 96px)" }}>
          <div style={{ display: "grid", gap: 40, gridTemplateColumns: "1fr", alignItems: "center" }} className="candy-hero-grid">
            <div className="candy-rise">
              <span className="candy-eyebrow">New series · matte solids</span>
              <h2 style={{ fontSize: "clamp(48px, 8.4vw, 96px)", marginTop: 16 }}>
                Wairo{" "}
                <span lang="ja" style={{ color: "var(--soda)" }}>和色</span>
              </h2>
              <p style={{ fontSize: "clamp(17px, 2.2vw, 21px)", fontWeight: 700, color: "var(--ink-soft)", maxWidth: 470, marginTop: 18 }}>
                Eight traditional Japanese hues in a soft matte finish — kuchiba amber,
                sakura pink, yamabuki gold. Quiet color, worn loud.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
                <Link href="/collections/wairo" className="candy-btn is-soda" tabIndex={active === 1 ? 0 : -1}>
                  Shop 和色 <span className="pop" aria-hidden>🎌</span>
                </Link>
                <Link href="/shop" className="candy-btn is-ghost" tabIndex={active === 1 ? 0 : -1}>See all sets</Link>
              </div>
            </div>

            <div style={{ position: "relative", minHeight: 420 }} className="candy-hero-art">
              <div className="candy-float d2" style={{ ["--rot" as string]: "-3deg", position: "absolute", top: 18, left: "2%", width: "52%", maxWidth: 252, zIndex: 3 }}>
                <HeroTile img="/images/website/wairo-model-amber.avif" alt="Model wearing Wairo matte amber press-on nails" border="var(--soda)" />
              </div>
              <div className="candy-float d3" style={{ ["--rot" as string]: "6deg", position: "absolute", top: 0, right: "0%", width: "42%", maxWidth: 200, zIndex: 2 }}>
                <HeroTile img="/images/website/wairo-model-pink.avif" alt="Model wearing Wairo matte sakura pink press-on nails" border="var(--bubblegum)" />
              </div>
              <div className="candy-float d1" style={{ ["--rot" as string]: "8deg", position: "absolute", top: "56%", right: "0%", width: "36%", maxWidth: 160, zIndex: 2 }}>
                <HeroTile img="/images/website/wairo-tsutsuji.avif" alt="Wairo tsutsuji azalea matte pink press-on nails" border="var(--grape)" />
              </div>
              <div className="candy-float d1" style={{ ["--rot" as string]: "-8deg", position: "absolute", bottom: -6, left: "30%", width: "34%", maxWidth: 158, zIndex: 1 }}>
                <HeroTile img="/images/website/wairo-model-gloss.avif" alt="Model wearing Wairo glossy pink press-on nails" border="var(--lemon)" />
              </div>
              <span className="candy-sticker is-soda candy-float" style={{ position: "absolute", top: 0, left: "26%", zIndex: 5, fontSize: 14 }}>
                8 new shades
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- dots ---- */}
      <div className="candy-hero-dots" role="tablist" aria-label="Choose slide">
        {SLIDES.map((s, i) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={i === 0 ? "Press on, show off" : "Wairo 和色"}
            className={`candy-hero-dot ${active === i ? "is-active" : ""}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

function HeroTile({ img, alt, border }: { img: string; alt: string; border: string }) {
  return (
    <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: 24, overflow: "hidden", boxShadow: "var(--shadow-pop)", background: border }}>
      <Image src={src(img)} alt={alt} fill sizes="280px" style={{ objectFit: "cover" }} />
    </div>
  );
}
