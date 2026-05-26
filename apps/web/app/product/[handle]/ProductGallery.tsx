"use client";

import { useState } from "react";
import type { ShopifyImage } from "@/lib/shopify/types";

export function ProductGallery({
  images,
  title,
}: {
  images: ShopifyImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ aspectRatio: "1/1", borderRadius: 28, border: "2.5px solid var(--ink)", background: "var(--cream)" }}
      >
        <span className="candy-eyebrow">No imagery</span>
      </div>
    );
  }

  const hero = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "1/1", borderRadius: 28, border: "2.5px solid var(--ink)", boxShadow: "var(--shadow-candy)" }}
      >
        { }
        <img
          key={hero.url}
          src={hero.url}
          alt={hero.altText ?? title}
          className="img-cover [animation:fade-in_240ms_ease]"
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(0, 8).map((img, i) => {
            const isActive = i === active;
            return (
              <button
                key={`${img.url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View ${i + 1} of ${images.length}`}
                aria-current={isActive}
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "1/1",
                  borderRadius: 16,
                  border: "2.5px solid var(--ink)",
                  opacity: isActive ? 1 : 0.7,
                  boxShadow: isActive ? "0 4px 0 var(--ink)" : "none",
                  transition: "opacity .2s ease, box-shadow .2s ease",
                }}
              >
                { }
                <img src={img.url} alt={img.altText ?? `${title} — view ${i + 1}`} className="img-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
