"use client";
import Link from "next/link";

import type { ShopifyProduct } from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";
import { FINGERS, firstVariantId, type SizeMap } from "@/lib/fit/sizing";
import { HandDiagram } from "./HandDiagram";

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD")
    return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

export function SizeMapCard({
  sizeMap,
  recommended,
  onRestart,
  onEditFinger,
}: {
  sizeMap: SizeMap;
  recommended: ShopifyProduct | null;
  onRestart: () => void;
  onEditFinger: (finger: import("@/lib/fit/sizing").FingerKey) => void;
}) {
  const variantId = recommended ? firstVariantId(recommended) : null;
  const canAdd = Boolean(recommended && variantId);

  return (
    <div className="grid grid-cols-12 gap-6 lg:gap-12 items-start">
      {/* size map */}
      <div className="col-span-12 lg:col-span-7">
        <div className="flex items-center gap-3 mb-5">
          <span className="cap">Result</span>
          <span className="cap">Fig. 02 — Your Size Map</span>
        </div>
        <h2 className="font-display font-light tracking-display leading-[0.95] text-[clamp(32px,4vw,56px)]">
          Locked in
          <span className="text-akane">.</span>
        </h2>
        <p className="mt-4 text-rikyu max-w-[440px]">
          Saved to this device. Screenshot it to keep your sizes handy when you
          apply — tap any nail to fine-tune.
        </p>

        <div className="mt-8 border border-hair">
          <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-tetsu text-paper">
            <span className="px-4 py-3 cap cap-dark">Finger</span>
            <span className="px-4 py-3 cap cap-dark text-center">Left</span>
            <span className="px-4 py-3 cap cap-dark text-center">Right</span>
          </div>
          {FINGERS.map((finger) => (
            <button
              key={finger}
              type="button"
              onClick={() => onEditFinger(finger)}
              className="w-full grid grid-cols-[1.4fr_1fr_1fr] items-center border-t border-hair bg-paper hover:bg-toriko transition-colors duration-200 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-akane focus-visible:-outline-offset-2"
            >
              <span className="px-4 py-3 font-display text-[17px] capitalize">
                {finger}
              </span>
              <span className="px-4 py-3 text-center font-mono text-[18px] text-tetsu tabular-nums">
                {sizeMap.left[finger]}
              </span>
              <span className="px-4 py-3 text-center font-mono text-[18px] text-tetsu tabular-nums">
                {sizeMap.right[finger]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 max-w-[280px]">
          <HandDiagram sizes={sizeMap.right} onSelect={onEditFinger} />
        </div>

        <button type="button" onClick={onRestart} className="btn-ghost mt-8">
          Start Over <span className="arrow">→</span>
        </button>
      </div>

      {/* recommendation */}
      <div className="col-span-12 lg:col-span-5">
        <div className="relative border border-hair bg-toriko p-6 md:p-8 shadow-editorial">
          <span className="crosshair" style={{ left: -8, top: -8 }} />
          <span className="crosshair" style={{ right: -8, top: -8 }} />
          <span className="crosshair" style={{ left: -8, bottom: -8 }} />
          <span className="crosshair" style={{ right: -8, bottom: -8 }} />

          <span className="cap block mb-5">Recommended Start</span>

          {recommended ? (
            <>
              <div className="relative aspect-[4/5] overflow-hidden bg-shiracha border border-hair">
                {recommended.featuredImage && (
                  <img
                    src={recommended.featuredImage.url}
                    alt={recommended.featuredImage.altText ?? recommended.title}
                    className="img-cover"
                  />
                )}
              </div>
              <div className="mt-5 flex items-start justify-between gap-4">
                <h3 className="font-display text-[22px] leading-[1.05]">
                  {recommended.title}
                </h3>
                <span className="font-display text-[18px] whitespace-nowrap">
                  {formatPrice(
                    recommended.priceRange.minVariantPrice.amount,
                    recommended.priceRange.minVariantPrice.currencyCode,
                  )}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-rikyu">
                Every starter set ships the full 0–9 range, so your map maps
                straight onto the box.
              </p>

              {canAdd ? (
                <form action={addToCart} className="mt-6">
                  <input type="hidden" name="variantId" value={variantId ?? ""} />
                  <input type="hidden" name="quantity" value="1" />
                  <button type="submit" className="btn-primary w-full justify-center">
                    Add Set To Cart <span className="arrow">→</span>
                  </button>
                </form>
              ) : (
                <Link
                  href={`/product/${recommended.handle}`}
                  className="btn-primary w-full justify-center mt-6"
                >
                  View Set <span className="arrow">→</span>
                </Link>
              )}
              <Link href="/shop" className="ulink mt-5 inline-block cap">
                Browse all sets →
              </Link>
            </>
          ) : (
            <>
              <p className="font-display text-[20px] text-tetsu">
                Your sizes are ready.
              </p>
              <p className="mt-2 text-[13px] text-rikyu">
                Browse the shop and pick a starter set — each one ships the full
                0–9 range to match your map.
              </p>
              <Link href="/shop" className="btn-primary w-full justify-center mt-6">
                Shop Starter Sets <span className="arrow">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
