"use client";

import { useEffect, useRef } from "react";

/* Autoplay/loop hero tile. Lives as a client component so `muted` is set as a
   DOM property (React omits it from SSR markup) — without it browsers block
   autoplay. Honors prefers-reduced-motion by holding on the poster frame. */
export function HeroVideoTile({
  src,
  poster,
  alt,
  border,
}: {
  src: string;
  poster: string;
  alt: string;
  border: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "4/5",
        borderRadius: 24,
        overflow: "hidden",
        border: "3px solid var(--ink)",
        boxShadow: "var(--shadow-pop)",
        background: border,
      }}
    >
      <video
        ref={ref}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={alt}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
