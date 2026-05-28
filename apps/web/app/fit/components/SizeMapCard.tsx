"use client";
import Link from "next/link";

import type { ShopifyProduct } from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";
import {
  FINGERS,
  type FingerKey,
  type SetSize,
  variantForSize,
  firstVariantId,
} from "@/lib/fit/sizing";

const FINGER_LABEL: Record<FingerKey, string> = {
  thumb: "Thumb",
  index: "Index",
  middle: "Middle",
  ring: "Ring",
  pinky: "Pinky",
};

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD")
    return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

export function SizeMapCard({
  fingerMm,
  size,
  recommended,
  onRestart,
  onEditFinger,
}: {
  fingerMm: Partial<Record<FingerKey, number>>;
  size: SetSize | null;
  recommended: ShopifyProduct | null;
  onRestart: () => void;
  onEditFinger: (finger: FingerKey) => void;
}) {
  // Wire Add-to-Cart straight to the matching Size variant; fall back to any
  // purchasable variant if the catalog isn't size-tagged for some reason.
  const variantId = recommended
    ? (size && variantForSize(recommended, size)) ?? firstVariantId(recommended)
    : null;
  const canAdd = Boolean(recommended && variantId);

  return (
    <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* result */}
      <div className="col-span-12 lg:col-span-7">
        <span className="candy-eyebrow">Your fit</span>

        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 16, flexWrap: "wrap" }}>
          {/* size medallion */}
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 124,
              height: 124,
              flex: "none",
              borderRadius: "50%",
              background: "var(--bubblegum)",
              border: "3px solid var(--ink)",
              boxShadow: "0 8px 0 var(--ink)",
              transform: "rotate(-4deg)",
            }}
          >
            <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: size && size.length > 1 ? 46 : 60, lineHeight: 1, color: "var(--ink)" }}>
              {size ?? "—"}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "clamp(30px,4.5vw,52px)" }}>
              You&apos;re a <span style={{ color: "var(--bubblegum-d)" }}>{size ?? "—"}</span>
            </h2>
            <p style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 380 }}>
              Saved to this device. Screenshot it for checkout — your set ships in
              the {size ?? "right"} size to fit every nail.
            </p>
          </div>
        </div>

        {/* per-nail recap — tap to re-measure */}
        <div style={{ marginTop: 28 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Your measurements · tap to tweak
          </span>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {FINGERS.map((finger) => {
              const mm = fingerMm[finger];
              return (
                <button key={finger} type="button" onClick={() => onEditFinger(finger)} className="candy-chip">
                  {FINGER_LABEL[finger]}
                  <span style={{ fontWeight: 700, color: "var(--ink-soft)" }}>
                    {typeof mm === "number" ? `${mm.toFixed(1)}mm` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 420 }}>
            Allow ±1–2mm for hand-measuring. Right between two sizes? Size up — a
            roomy nail can be filed down, a tight one can&apos;t be stretched.
          </p>
        </div>

        <button type="button" onClick={onRestart} className="candy-btn is-ghost" style={{ marginTop: 26 }}>
          Start over
        </button>
      </div>

      {/* recommendation */}
      <div className="col-span-12 lg:col-span-5">
        <div
          style={{
            background: "var(--cream)",
            border: "2.5px solid var(--ink)",
            borderRadius: 26,
            padding: "clamp(20px,3vw,28px)",
            boxShadow: "var(--shadow-candy)",
          }}
        >
          <span className="candy-sticker is-mint" style={{ marginBottom: 18 }}>Recommended start</span>

          {recommended ? (
            <>
              <div
                style={{
                  position: "relative",
                  marginTop: 16,
                  aspectRatio: "4 / 5",
                  overflow: "hidden",
                  borderRadius: 18,
                  border: "2.5px solid var(--ink)",
                  background: "var(--cotton)",
                }}
              >
                {recommended.featuredImage && (
                  <img
                    src={recommended.featuredImage.url}
                    alt={recommended.featuredImage.altText ?? recommended.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
              <div style={{ marginTop: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                <h3 style={{ fontSize: 22, lineHeight: 1.1 }}>{recommended.title}</h3>
                <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 20, whiteSpace: "nowrap" }}>
                  {formatPrice(
                    recommended.priceRange.minVariantPrice.amount,
                    recommended.priceRange.minVariantPrice.currencyCode,
                  )}
                </span>
              </div>
              <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                Ships in your <strong style={{ color: "var(--ink)" }}>{size ?? "chosen"}</strong> size — every nail in the
                tray scaled to fit.
              </p>

              {canAdd ? (
                <form action={addToCart} style={{ marginTop: 22 }}>
                  <input type="hidden" name="variantId" value={variantId ?? ""} />
                  <input type="hidden" name="quantity" value="1" />
                  <button type="submit" className="candy-btn" style={{ width: "100%" }}>
                    Add {size ? `${size} ` : ""}set to cart <span className="pop" aria-hidden>→</span>
                  </button>
                </form>
              ) : (
                <Link href={`/product/${recommended.handle}`} className="candy-btn" style={{ width: "100%", marginTop: 22 }}>
                  View set <span className="pop" aria-hidden>→</span>
                </Link>
              )}
              <Link href="/shop" className="candy-btn is-ghost" style={{ width: "100%", marginTop: 12 }}>
                Browse all sets
              </Link>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 20, marginTop: 16 }}>
                Your size is ready.
              </p>
              <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                Browse the shop and pick a set — each one comes in S, M, L and XL.
              </p>
              <Link href="/shop" className="candy-btn" style={{ width: "100%", marginTop: 22 }}>
                Shop sets <span className="pop" aria-hidden>→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
