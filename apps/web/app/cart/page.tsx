import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCart, removeLine, updateLineQuantity } from "@/lib/shopify/cart";
import type { ShopifyCartLine } from "@/lib/shopify/types";
import { FREE_SHIPPING_THRESHOLD, freeShippingRemaining } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Cart · Nailismo",
  description: "Your bag. Checkout runs on Shopify — secure and fast.",
  alternates: { canonical: "/cart" },
};

export const dynamic = "force-dynamic";

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (currency === "USD") return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;
}

function LineRow({ line }: { line: ShopifyCartLine }) {
  const m = line.merchandise;
  const variantLabel = m.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(" · ");
  return (
    <article className="candy-line">
      <div className="candy-line-img">
        {m.image ? (
          <Image src={m.image.url} alt={m.image.altText ?? m.product.title} fill sizes="84px" />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/products/${m.product.handle}`} style={{ fontFamily: "var(--display)", fontSize: 22, lineHeight: 1.1 }}>
          {m.product.title}
        </Link>
        {variantLabel && (
          <p style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>{variantLabel}</p>
        )}
        <form action={updateLineQuantity} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <input type="hidden" name="lineId" value={line.id} />
          <button type="submit" name="quantity" value={Math.max(0, line.quantity - 1)} className="candy-step-btn" aria-label="Decrease quantity">−</button>
          <span style={{ fontFamily: "var(--body)", fontWeight: 800, minWidth: 28, textAlign: "center" }}>{line.quantity}</span>
          <button type="submit" name="quantity" value={line.quantity + 1} className="candy-step-btn" aria-label="Increase quantity">+</button>
        </form>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 18 }}>
          {formatPrice(line.cost.totalAmount.amount, line.cost.totalAmount.currencyCode)}
        </span>
        <form action={removeLine}>
          <input type="hidden" name="lineId" value={line.id} />
          <button type="submit" style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-soft)", textDecoration: "underline", textUnderlineOffset: 3 }}>Remove</button>
        </form>
      </div>
    </article>
  );
}

export default async function CartPage() {
  const cart = await getCart();
  const lines = cart?.lines.nodes ?? [];
  const empty = lines.length === 0;
  const count = cart?.totalQuantity ?? 0;

  // Free-shipping progress nudge — dollar threshold only makes sense in USD.
  const subtotalNum = cart ? Number(cart.cost.subtotalAmount.amount) : 0;
  const isUsd = (cart?.cost.subtotalAmount.currencyCode ?? "USD") === "USD";
  const freeShipRemaining = isUsd ? freeShippingRemaining(subtotalNum) : 0;
  const freeShipUnlocked = isUsd && subtotalNum >= FREE_SHIPPING_THRESHOLD;
  const freeShipProgress = isUsd ? Math.min(1, subtotalNum / FREE_SHIPPING_THRESHOLD) : 0;

  return (
    <>
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Cart</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Your bag</span>
          <h1 style={{ marginTop: 10 }}>Almost yours</h1>
          <p>Review your sets — checkout is fast and secure on Shopify. <strong>{count}</strong> {count === 1 ? "item" : "items"}.</p>
        </div>

        <div style={{ marginTop: 36 }}>
          {empty ? (
            <div className="candy-empty">
              <div className="emoji" aria-hidden>🛍️</div>
              <h2>Your bag is empty</h2>
              <p>Pick a flavor — they press on in minutes.</p>
              <Link href="/shop" className="candy-btn" style={{ marginTop: 22 }}>Shop the rack <span className="pop" aria-hidden>🍬</span></Link>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-8">
                {lines.map((line) => (
                  <LineRow key={line.id} line={line} />
                ))}
              </div>

              <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 self-start">
                <div style={{ background: "var(--cream)", border: "1px solid var(--marshmallow)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow-candy)" }}>
                  <span className="candy-eyebrow" style={{ display: "block", marginBottom: 14 }}>Summary</span>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "2px solid var(--marshmallow)" }}>
                    <span style={{ fontWeight: 700, color: "var(--ink-soft)" }}>Subtotal</span>
                    <span style={{ fontFamily: "var(--body)", fontWeight: 800, fontSize: 18 }}>
                      {cart && formatPrice(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "2px solid var(--marshmallow)" }}>
                    <span style={{ fontWeight: 700, color: "var(--ink-soft)" }}>Shipping</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-soft)" }}>Calculated at checkout</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "16px 0" }}>
                    <span className="candy-eyebrow">Total</span>
                    <span style={{ fontFamily: "var(--display)", fontSize: 34, lineHeight: 1 }}>
                      {cart && formatPrice(cart.cost.totalAmount.amount, cart.cost.totalAmount.currencyCode)}
                    </span>
                  </div>
                  {isUsd && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "12px 14px",
                        background: freeShipUnlocked ? "var(--spearmint)" : "var(--soda)",
                        border: "2.5px solid var(--ink)",
                        borderRadius: 16,
                      }}
                    >
                      <p style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--body)", fontWeight: 800, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.4 }}>
                        <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>{freeShipUnlocked ? "🎉" : "🚚"}</span>
                        {freeShipUnlocked
                          ? "Free shipping unlocked!"
                          : `You're ${formatPrice(String(freeShipRemaining), "USD")} from free shipping — add one more set.`}
                      </p>
                      <div aria-hidden style={{ marginTop: 10, height: 8, borderRadius: 999, background: "var(--cream)", border: "2px solid var(--ink)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(freeShipProgress * 100)}%`, background: "var(--bubblegum)", transition: "width .3s ease" }} />
                      </div>
                    </div>
                  )}
                  {cart?.checkoutUrl && (
                    <a href={cart.checkoutUrl} className="candy-btn" style={{ width: "100%", marginTop: 16 }}>Checkout <span className="pop" aria-hidden>✨</span></a>
                  )}
                  <Link href="/shop" className="candy-btn is-ghost" style={{ width: "100%", marginTop: 10 }}>Keep shopping</Link>
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginTop: 14, lineHeight: 1.6 }}>
                  Secure checkout on Shopify. Your bag persists for 14 days on this device.
                </p>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
