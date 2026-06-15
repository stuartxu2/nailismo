"use client";
import { useMemo, useState } from "react";
import type { ShopifyProductOption, ShopifyVariant } from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

const TRUST: Record<"gift" | "essential", string[]> = {
  gift: [
    "Delivered instantly by email",
    "Never expires",
    "Redeemable on any order",
    "No fees, no card to lose",
  ],
  essential: [
    "Salon-grade formula",
    "Pairs with every press-on set",
    `Free shipping over $${FREE_SHIPPING_THRESHOLD}`,
    "30-day unopened returns",
  ],
};

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

/** Lean buy box for gift cards + care essentials. Same selection mechanics as
 *  PurchasePanel but without the nail-set trust copy, sizing nudge, or
 *  Find My Size CTA — none of which apply to these products. */
export function SimplePurchasePanel({
  options,
  variants,
  defaultVariantId,
  kind,
  ctaLabel,
}: {
  options: ShopifyProductOption[];
  variants: ShopifyVariant[];
  defaultVariantId: string | null;
  kind: "gift" | "essential";
  ctaLabel: string;
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

  function isValueAvailable(optName: string, value: string) {
    const probe = { ...selected, [optName]: value };
    return Boolean(matchVariant(variants, probe)?.availableForSale);
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between" style={{ gap: 16 }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 44, lineHeight: 1, color: "var(--ink)" }}>{priceLabel}</span>
        <span className="candy-sticker is-mint" style={{ fontSize: 12 }}>
          {kind === "gift"
            ? available ? "Sent by email · instant" : "Unavailable"
            : available ? "In stock · ships in 24h" : "Sold out"}
        </span>
      </div>

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
            </div>
          ))}
        </div>
      )}

      <ul
        className="mt-8"
        style={{
          listStyle: "none",
          margin: 0,
          padding: "16px 18px",
          display: "grid",
          gap: 7,
          background: "var(--cream)",
          border: "1px solid var(--marshmallow)",
          borderRadius: 18,
          boxShadow: "var(--shadow-candy)",
        }}
      >
        {TRUST[kind].map((t) => (
          <li key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckMark />
            <span style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{t}</span>
          </li>
        ))}
      </ul>

      {/* inline action (desktop) */}
      <div className="mt-10 hidden md:flex flex-wrap gap-3">
        {available && variant ? (
          <form action={addToCart}>
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="quantity" value="1" />
            <button type="submit" className="candy-btn">{ctaLabel} <span className="pop" aria-hidden>{kind === "gift" ? "🎁" : "🛍️"}</span></button>
          </form>
        ) : (
          <span className="candy-btn is-ghost" style={{ opacity: 0.6, pointerEvents: "none" }}>Sold Out</span>
        )}
      </div>

      {/* sticky add bar (mobile) */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)",
          borderTop: "2px solid var(--marshmallow)",
        }}
      >
        <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 20 }}>{priceLabel}</span>
        {available && variant ? (
          <form action={addToCart} style={{ marginLeft: "auto", flex: 1, maxWidth: 240 }}>
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="quantity" value="1" />
            <button type="submit" className="candy-btn" style={{ width: "100%" }}>{ctaLabel}</button>
          </form>
        ) : (
          <span className="candy-btn is-ghost" style={{ marginLeft: "auto", opacity: 0.6, pointerEvents: "none" }}>Sold Out</span>
        )}
      </div>
    </>
  );
}
