"use client";

import { useState } from "react";

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
  // Open on the first video if the product has one, else the first item.
  const [active, setActive] = useState(() => {
    const vi = items.findIndex((it) => it.kind !== "image");
    return vi >= 0 ? vi : 0;
  });

  if (items.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ aspectRatio: "1/1", borderRadius: 28, border: "2.5px solid var(--ink)", background: "var(--cream)" }}
      >
        <span className="candy-eyebrow">No imagery</span>
      </div>
    );
  }

  const hero = items[active] ?? items[0];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "1/1", borderRadius: 28, border: "2.5px solid var(--ink)", boxShadow: "var(--shadow-candy)" }}
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
          <img
            key={hero.url}
            src={hero.url}
            alt={hero.altText ?? title}
            className="img-cover [animation:fade-in_240ms_ease]"
          />
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
                  border: "2.5px solid var(--ink)",
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
