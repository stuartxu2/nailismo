"use client";
import Link from "next/link";

import { useMemo, useState } from "react";
import type { ShopifyProductOption, ShopifyVariant } from "@/lib/shopify/types";
import { addToCart } from "@/lib/shopify/cart";

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

  function isValueAvailable(optName: string, value: string) {
    const probe = { ...selected, [optName]: value };
    const m = matchVariant(variants, probe);
    return Boolean(m?.availableForSale);
  }

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between border-t border-hair pt-6">
        <div>
          <span className="cap">Price</span>
          <div className="font-display text-[40px] leading-none mt-1 text-tetsu">
            {variant
              ? formatPrice(variant.price.amount, variant.price.currencyCode)
              : "—"}
          </div>
        </div>
        <span className="cap">
          {variant?.availableForSale ? "In stock · Ships in 24h" : "Sold out"}
        </span>
      </div>

      {options.length > 0 && (
        <div className="mt-8 space-y-6">
          {options.map((opt) => (
            <div key={opt.id}>
              <span className="cap mb-3 block">{opt.name}</span>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((v) => {
                  const active = selected[opt.name] === v;
                  const available = isValueAvailable(opt.name, v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => ({ ...prev, [opt.name]: v }))
                      }
                      aria-pressed={active}
                      className={`edit-pill ${active ? "edit-pill-active" : ""} ${
                        !available ? "opacity-40 line-through" : ""
                      }`}
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

      <div className="mt-10 flex flex-wrap gap-3">
        {variant?.availableForSale ? (
          <form action={addToCart}>
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="quantity" value="1" />
            <button type="submit" className="btn-primary">
              Add To Cart <span className="arrow">→</span>
            </button>
          </form>
        ) : (
          <span className="btn-ghost opacity-60 pointer-events-none">Sold Out</span>
        )}
        <Link href="/#fit" className="btn-ghost">
          See The Fit System <span className="arrow">→</span>
        </Link>
      </div>
    </>
  );
}
