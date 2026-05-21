import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { getCart, removeLine, updateLineQuantity } from "@/lib/shopify/cart";
import type { ShopifyCartLine } from "@/lib/shopify/types";

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

function LineRow({ line, index }: { line: ShopifyCartLine; index: number }) {
  const m = line.merchandise;
  const variantLabel = m.selectedOptions
    .map((o) => `${o.name}: ${o.value}`)
    .join(" · ");
  return (
    <article className="grid grid-cols-12 gap-4 md:gap-6 py-6 border-b border-hair">
      <div className="col-span-3 md:col-span-2">
        <div className="relative aspect-square overflow-hidden bg-shiracha border border-hair">
          {m.image ? (
            <img
              src={m.image.url}
              alt={m.image.altText ?? m.product.title}
              className="img-cover"
            />
          ) : null}
          <span className="absolute top-1.5 left-1.5 cap text-paper bg-tetsu px-1.5 py-0.5 text-[9px]">
            N°{String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="col-span-9 md:col-span-6 flex flex-col">
        <Link
          href={`/product/${m.product.handle}`}
          className="font-display text-[20px] md:text-[24px] leading-[1.1] ulink"
        >
          {m.product.title}
        </Link>
        {variantLabel && (
          <span className="mt-1 text-[12px] text-rikyu">{variantLabel}</span>
        )}
        <form
          action={updateLineQuantity}
          className="mt-4 flex items-center gap-2"
        >
          <input type="hidden" name="lineId" value={line.id} />
          <button
            type="submit"
            name="quantity"
            value={Math.max(0, line.quantity - 1)}
            className="w-8 h-8 border border-hair flex items-center justify-center hover:bg-tetsu hover:text-paper transition-colors text-[14px]"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="font-mono text-[12px] tracking-[0.18em] min-w-[32px] text-center">
            {line.quantity}
          </span>
          <button
            type="submit"
            name="quantity"
            value={line.quantity + 1}
            className="w-8 h-8 border border-hair flex items-center justify-center hover:bg-tetsu hover:text-paper transition-colors text-[14px]"
            aria-label="Increase quantity"
          >
            +
          </button>
        </form>
      </div>
      <div className="col-span-12 md:col-span-4 flex md:flex-col items-end md:items-end justify-between md:justify-start gap-2">
        <span className="font-display text-[20px] text-tetsu">
          {formatPrice(line.cost.totalAmount.amount, line.cost.totalAmount.currencyCode)}
        </span>
        <form action={removeLine}>
          <input type="hidden" name="lineId" value={line.id} />
          <button
            type="submit"
            className="ulink text-[10px] tracking-[0.18em] uppercase font-medium text-rikyu hover:text-akane"
          >
            Remove
          </button>
        </form>
      </div>
    </article>
  );
}

export default async function CartPage() {
  const cart = await getCart();
  const lines = cart?.lines.nodes ?? [];
  const empty = lines.length === 0;

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <Link href="/" className="ulink">Home</Link>
              <span>/</span>
              <span className="text-tetsu">Cart</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">Bag · Pre-Checkout</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  Your
                  <br />
                  <span className="italic font-serif font-light">bag</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">
                  Review your sets. Checkout runs on Shopify — payment, address,
                  and shipping handled there.
                </p>
                <div className="mt-6 cap">
                  {cart?.totalQuantity ?? 0}{" "}
                  {cart?.totalQuantity === 1 ? "item" : "items"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            {empty ? (
              <div className="border border-hair py-24 text-center">
                <span className="cap block mb-4">Empty Bag</span>
                <p className="font-display text-[28px] text-tetsu max-w-[420px] mx-auto leading-[1.15]">
                  Nothing in your bag yet.
                </p>
                <p className="text-rikyu mt-3 max-w-[360px] mx-auto text-[14px]">
                  Browse the index, pick a set, add it from the product page.
                </p>
                <Link href="/shop" className="btn-primary mt-8 inline-flex">
                  Open The Index <span className="arrow">→</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-12 lg:col-span-8 border-t border-hair">
                  {lines.map((line, i) => (
                    <LineRow key={line.id} line={line} index={i} />
                  ))}
                </div>

                <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 self-start">
                  <div className="border border-hair p-6 bg-toriko">
                    <span className="cap block mb-4">Summary</span>
                    <div className="flex items-baseline justify-between py-2 border-b border-hair">
                      <span className="text-[13px] text-rikyu">Subtotal</span>
                      <span className="font-display text-[20px] text-tetsu">
                        {cart &&
                          formatPrice(
                            cart.cost.subtotalAmount.amount,
                            cart.cost.subtotalAmount.currencyCode,
                          )}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between py-2 border-b border-hair">
                      <span className="text-[13px] text-rikyu">Shipping</span>
                      <span className="text-[12px] text-rikyu">
                        Calculated at checkout
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between py-4">
                      <span className="cap">Total</span>
                      <span className="font-display text-[32px] text-tetsu leading-none">
                        {cart &&
                          formatPrice(
                            cart.cost.totalAmount.amount,
                            cart.cost.totalAmount.currencyCode,
                          )}
                      </span>
                    </div>
                    {cart?.checkoutUrl && (
                      <a href={cart.checkoutUrl} className="btn-primary w-full justify-center mt-4">
                        Checkout <span className="arrow">→</span>
                      </a>
                    )}
                    <Link href="/shop" className="btn-ghost w-full justify-center mt-3">
                      Keep Shopping <span className="arrow">→</span>
                    </Link>
                  </div>
                  <p className="text-[11px] text-rikyu mt-4 leading-[1.6]">
                    Secure checkout on Shopify. Your bag persists for 14 days on
                    this device.
                  </p>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
