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
      <div className="aspect-square bg-shiracha border border-hair flex items-center justify-center">
        <span className="cap">No imagery</span>
      </div>
    );
  }

  const hero = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden bg-shiracha border border-hair">
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
                className={`relative aspect-square overflow-hidden bg-shiracha border transition-[border-color,opacity] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-akane focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:opacity-80 ${
                  isActive
                    ? "border-tetsu"
                    : "border-hair opacity-70 hover:opacity-100 hover:border-rikyu"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.altText ?? `${title} — view ${i + 1}`}
                  className="img-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
