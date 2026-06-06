"use client";
import Link from "next/link";

import { useMemo, useState } from "react";
import type { ShopifyProductOption, ShopifyVariant } from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

const TRUST_POINTS = [
  "10 premium nails + toolkit included",
  "100% hand-painted",
  `Free shipping over $${FREE_SHIPPING_THRESHOLD}`,
  "30-day unopened returns + fit exchange",
];

function CheckMark() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: 999,
        background: "var(--bubblegum)",
        border: "2px solid var(--ink)",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

function matchVariant(
  variants: ShopifyVariant[],
  selected: Record<string, string>,
): ShopifyVariant | undefined {
  return variants.find((v) =>
    v.selectedOptions.every((so) => selected[so.name] === so.value),
  );
}

export function PurchasePanel({
  options,
  variants,
  defaultVariantId,
}: {
  options: ShopifyProductOption[];
  variants: ShopifyVariant[];
  defaultVariantId: string | null;
}) {
  const initialSelected = useMemo(() => {
    const def = variants.find((v) => v.id === defaultVariantId) ?? variants[0];
    const map: Record<string, string> = {};
    def?.selectedOptions.forEach((so) => {
      map[so.name] = so.value;
    });
    return map;
  }, [variants, defaultVariantId]);

  const [selected, setSelected] = useState<Record<string, string>>(initialSelected);

  const variant = matchVariant(variants, selected);
  const available = Boolean(variant?.availableForSale);
  const priceLabel = variant ? formatPrice(variant.price.amount, variant.price.currencyCode) : "—";
  const priceNum = variant ? Number(variant.price.amount) : NaN;
  const underFreeShip = Number.isFinite(priceNum) && priceNum < FREE_SHIPPING_THRESHOLD;

  function isValueAvailable(optName: string, value: string) {
    const probe = { ...selected, [optName]: value };
    const m = matchVariant(variants, probe);
    return Boolean(m?.availableForSale);
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between" style={{ gap: 16 }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 44, lineHeight: 1, color: "var(--ink)" }}>{priceLabel}</span>
        <span className="candy-sticker is-mint" style={{ fontSize: 12 }}>
          {available ? "In stock · ships in 24h" : "Sold out"}
        </span>
      </div>

      {/* trust signals — surfaced above the size picker and the Add to Bag CTA */}
      <ul
        className="mt-9"
        style={{
          listStyle: "none",
          margin: 0,
          padding: "16px 18px",
          display: "grid",
          gap: 7,
          background: "var(--cream)",
          border: "2.5px solid var(--ink)",
          borderRadius: 18,
          boxShadow: "var(--shadow-candy)",
        }}
      >
        {TRUST_POINTS.map((t) => (
          <li key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckMark />
            <span style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{t}</span>
          </li>
        ))}
      </ul>

      {options.length > 0 && (
        <div className="mt-8" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {options.map((opt) => (
            <div key={opt.id}>
              <span className="candy-label">{opt.name}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {opt.values.map((v) => {
                  const isActive = selected[opt.name] === v;
                  const ok = isValueAvailable(opt.name, v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [opt.name]: v }))}
                      aria-pressed={isActive}
                      className={`candy-chip ${isActive ? "is-active" : ""}`}
                      style={!ok ? { opacity: 0.4, textDecoration: "line-through" } : undefined}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              {/* unsure? steer first-timers to the Fit tool + reassure on exchange */}
              {/size/i.test(opt.name) && (
                <p style={{ marginTop: 10, fontFamily: "var(--body)", fontWeight: 600, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  Not sure?{" "}
                  <Link href="/fit" style={{ fontWeight: 800, color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                    Find My Size
                  </Link>{" "}
                  takes most first-timers 90 seconds. Fit exchange available if it&apos;s off.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AOV nudge — most single sets sit under the free-ship line */}
      {available && underFreeShip && (
        <div
          className="mt-6"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "var(--soda)",
            border: "2.5px solid var(--ink)",
            borderRadius: 16,
            boxShadow: "var(--shadow-candy)",
          }}
        >
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>🚚</span>
          <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>
            Add one more set to unlock free shipping.
          </span>
        </div>
      )}

      {/* inline actions (desktop) */}
      <div className="mt-10 hidden md:flex flex-wrap gap-3">
        {available && variant ? (
          <form action={addToCart}>
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="quantity" value="1" />
            <button type="submit" className="candy-btn">Add to Bag <span className="pop" aria-hidden>🛍️</span></button>
          </form>
        ) : (
          <span className="candy-btn is-ghost" style={{ opacity: 0.6, pointerEvents: "none" }}>Sold Out</span>
        )}
        <Link href="/fit" className="candy-btn is-ghost">Find My Size</Link>
      </div>

      {/* sticky add-to-bag bar (mobile) */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)",
          borderTop: "2.5px solid var(--ink)",
        }}
      >
        <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 20 }}>{priceLabel}</span>
        {available && variant ? (
          <form action={addToCart} style={{ marginLeft: "auto", flex: 1, maxWidth: 240 }}>
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="quantity" value="1" />
            <button type="submit" className="candy-btn" style={{ width: "100%" }}>Add to Bag</button>
          </form>
        ) : (
          <span className="candy-btn is-ghost" style={{ marginLeft: "auto", opacity: 0.6, pointerEvents: "none" }}>Sold Out</span>
        )}
      </div>
    </>
  );
}
