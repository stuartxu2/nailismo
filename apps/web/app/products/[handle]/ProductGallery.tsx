"use client";

import { useRef, useState } from "react";

export type GalleryItem =
  | { kind: "image"; url: string; altText: string | null }
  | { kind: "video"; sources: { url: string; type: string }[]; poster: string | null; altText: string | null }
  | { kind: "embed"; embedUrl: string; poster: string | null; altText: string | null };

function thumbUrl(item: GalleryItem): string | null {
  if (item.kind === "image") return item.url;
  return item.poster;
}

export function ProductGallery({
  items,
  title,
}: {
  items: GalleryItem[];
  title: string;
}) {
  // Open on the first still image (zoomable hero); fall back to the first item.
  const [active, setActive] = useState(() => {
    const ii = items.findIndex((it) => it.kind === "image");
    return ii >= 0 ? ii : 0;
  });

  // Hover magnifier (inner zoom) — only meaningful for still images.
  const heroRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ on: boolean; x: number; y: number }>({
    on: false,
    x: 50,
    y: 50,
  });

  function handleZoomMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ on: true, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  if (items.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ aspectRatio: "1/1", borderRadius: 28, border: "1px solid var(--marshmallow)", background: "var(--cream)" }}
      >
        <span className="candy-eyebrow">No imagery</span>
      </div>
    );
  }

  const hero = items[active] ?? items[0];
  const heroIsImage = hero.kind === "image";

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={heroRef}
        className="relative overflow-hidden"
        style={{
          aspectRatio: "1/1",
          borderRadius: 28,
          boxShadow: "var(--shadow-candy)",
          cursor: heroIsImage ? "zoom-in" : "default",
        }}
        onMouseMove={heroIsImage ? handleZoomMove : undefined}
        onMouseLeave={heroIsImage ? () => setZoom((z) => ({ ...z, on: false })) : undefined}
      >
        {hero.kind === "video" ? (
          <video
            key={hero.sources[0]?.url}
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hero.poster ?? undefined}
            aria-label={hero.altText || `${title} — video`}
            className="img-cover [animation:fade-in_240ms_ease]"
          >
            {hero.sources.map((s) => (
              <source key={s.url} src={s.url} type={s.type} />
            ))}
          </video>
        ) : hero.kind === "embed" ? (
          <iframe
            key={hero.embedUrl}
            src={hero.embedUrl}
            title={hero.altText || `${title} — video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="img-cover"
            style={{ border: 0 }}
          />
        ) : (
          <>
            <img
              key={hero.url}
              src={hero.url}
              alt={hero.altText ?? title}
              className="img-cover [animation:fade-in_240ms_ease]"
              style={{
                transformOrigin: `${zoom.x}% ${zoom.y}%`,
                transform: zoom.on ? "scale(2.4)" : "scale(1)",
                transition: "transform .28s cubic-bezier(.2,.8,.2,1)",
                willChange: "transform",
              }}
              draggable={false}
            />
            <span
              aria-hidden
              className="candy-eyebrow"
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.92)",
                border: "2px solid var(--ink)",
                boxShadow: "0 2px 0 var(--ink)",
                fontSize: 11,
                pointerEvents: "none",
                opacity: zoom.on ? 0 : 1,
                transition: "opacity .2s ease",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
              Hover to zoom
            </span>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {items.slice(0, 8).map((item, i) => {
            const isActive = i === active;
            const isVideo = item.kind !== "image";
            const src = thumbUrl(item);
            return (
              <button
                key={`${i}-${item.kind}`}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View ${isVideo ? "video" : "image"} ${i + 1} of ${items.length}`}
                aria-current={isActive}
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "1/1",
                  borderRadius: 16,
                  border: isActive ? "2px solid var(--ink)" : "1px solid var(--marshmallow)",
                  background: "var(--cream)",
                  opacity: isActive ? 1 : 0.7,
                  boxShadow: isActive ? "0 4px 0 var(--ink)" : "none",
                  transition: "opacity .2s ease, box-shadow .2s ease",
                }}
              >
                {src ? (
                  <img src={src} alt={item.altText ?? `${title} — view ${i + 1}`} className="img-cover" />
                ) : null}
                {isVideo && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.92)",
                        border: "2px solid var(--ink)",
                        boxShadow: "0 2px 0 var(--ink)",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--ink)" aria-hidden>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
